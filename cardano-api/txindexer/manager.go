package txindexer

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"path/filepath"
	"sync"
	"time"

	eventStore "github.com/Ethernal-Tech/blockchain-event-tracker/store"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	solanaStore "github.com/Ethernal-Tech/solana-infrastructure/tracker/store"
	"github.com/hashicorp/go-hclog"
)

const bridgingTxsDBName = "bridging_txs.db"

type allBridgingAddressesResponse struct {
	Addresses []string `json:"addresses"`
}

// Manager starts all configured indexers and owns their databases
type Manager struct {
	appConfig *core.AppConfig
	config    *core.IndexerConfig
	store     *BBoltStore
	closers   []io.Closer
	starters  []func(ctx context.Context)
	logger    hclog.Logger
	wg        sync.WaitGroup
}

func NewManager(appConfig *core.AppConfig, logger hclog.Logger) (*Manager, error) {
	config := appConfig.Indexer

	if err := common.CreateDirectoryIfNotExists(config.DbsPath, 0750); err != nil {
		return nil, fmt.Errorf("failed to create indexer dbs directory: %w", err)
	}

	store, err := NewBBoltStore(filepath.Join(config.DbsPath, bridgingTxsDBName))
	if err != nil {
		return nil, err
	}

	m := &Manager{
		appConfig: appConfig,
		config:    config,
		store:     store,
		closers:   []io.Closer{store},
		logger:    logger,
	}

	if err := m.createIndexers(); err != nil {
		_ = m.Close()

		return nil, err
	}

	return m, nil
}

func (m *Manager) Store() BridgingTxsStore {
	return m.store
}

func (m *Manager) Start(ctx context.Context) {
	for _, start := range m.starters {
		m.wg.Add(1)

		go func() {
			defer m.wg.Done()

			start(ctx)
		}()
	}

	m.wg.Add(1)

	go func() {
		defer m.wg.Done()

		m.pruneLoop(ctx)
	}()
}

// Close must be called after the context passed to Start is cancelled
func (m *Manager) Close() error {
	m.wg.Wait()

	errs := make([]error, 0, len(m.closers))
	for i := len(m.closers) - 1; i >= 0; i-- {
		errs = append(errs, m.closers[i].Close())
	}

	return errors.Join(errs...)
}

func (m *Manager) createIndexers() error {
	for chainID, chainConfig := range m.config.CardanoChains {
		cardanoConfig := m.appConfig.CardanoChains[chainID]

		chainLogger, err := m.newChainLogger(chainID)
		if err != nil {
			return err
		}

		ci, err := newCardanoIndexer(
			chainConfig, cardanoConfig.NetworkMagic, m.store, m.store,
			m.getCardanoBridgingAddresses, m.resolveCardanoTokenID, m.logger.Named("cardano_"+chainID), chainLogger)
		if err != nil {
			return err
		}

		m.starters = append(m.starters, ci.Start)
	}

	if len(m.config.EthChains) > 0 {
		chainIDs, err := LoadChainIDConverter(m.config.ChainIDsConfigPath)
		if err != nil {
			return err
		}

		for chainID, chainConfig := range m.config.EthChains {
			store, err := eventStore.NewBoltDBEventTrackerStore(m.chainDBPath("evm", chainID))
			if err != nil {
				return fmt.Errorf("failed to open evm tracker db for %s: %w", chainID, err)
			}

			m.closers = append(m.closers, store)

			chainLogger, err := m.newChainLogger(chainID)
			if err != nil {
				return err
			}

			ei, err := newEvmIndexer(
				chainConfig, store, chainIDs, m.store, m.logger.Named("evm_"+chainID), chainLogger)
			if err != nil {
				return err
			}

			m.starters = append(m.starters, ei.Start)
		}
	}

	for chainID, chainConfig := range m.config.SolanaChains {
		store, err := solanaStore.NewBoltStorageHandler(m.chainDBPath("solana", chainID))
		if err != nil {
			return fmt.Errorf("failed to open solana tracker db for %s: %w", chainID, err)
		}

		m.closers = append(m.closers, store)

		chainLogger, err := m.newChainLogger(chainID)
		if err != nil {
			return err
		}

		si := newSolanaIndexer(
			chainConfig, store, m.store, m.resolveSolanaTokenID, m.logger.Named("solana_"+chainID), chainLogger)

		m.starters = append(m.starters, si.Start)
	}

	return nil
}

func (m *Manager) newChainLogger(chainID string) (hclog.Logger, error) {
	return newChainLogger(m.appConfig.Settings.Logger, m.config.LogLevel, chainID, m.logger.Named(chainID))
}

func (m *Manager) chainDBPath(chainType, chainID string) string {
	return filepath.Join(m.config.DbsPath, fmt.Sprintf("%s_%s.db", chainType, chainID))
}

func (m *Manager) pruneLoop(ctx context.Context) {
	for {
		cnt, err := m.store.PruneBridgingTxs(time.Now().UTC().Add(-m.config.RetentionPeriod))
		if err != nil {
			m.logger.Error("Failed to prune bridging txs", "err", err)
		} else if cnt > 0 {
			m.logger.Info("Pruned bridging txs", "count", cnt)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(m.config.PruneInterval):
		}
	}
}

func (m *Manager) getCardanoBridgingAddresses(ctx context.Context, chainID string) ([]string, error) {
	if m.appConfig.RunMode == common.ReactorMode {
		// reactor has a single bridging address which is updated on validator change
		if addr := m.appConfig.GetCardanoMultiSigAddress(chainID); addr != "" {
			return []string{addr}, nil
		}

		return nil, fmt.Errorf("bridging address not found for chain %s", chainID)
	}

	requestURL := fmt.Sprintf("%s/api/BridgingAddress/GetAllAddresses?chainId=%s",
		m.appConfig.OracleAPI.URL, url.QueryEscape(chainID))

	response, err := common.HTTPGet[*allBridgingAddressesResponse](ctx, requestURL, m.appConfig.OracleAPI.APIKey)
	if err != nil {
		return nil, err
	}

	return response.Addresses, nil
}

func (m *Manager) resolveCardanoTokenID(chainID string, isNativeTokenOnSrc bool) uint16 {
	if m.appConfig.RunMode != common.SkylineMode {
		return 0
	}

	tokens, err := m.appConfig.SkylineBridgingSettings.GetTokens(chainID)
	if err != nil {
		return 0
	}

	// same as apex-bridge: metadata without token ID refers either to currency or to wrapped currency
	for id, token := range tokens {
		if isNativeTokenOnSrc && token.IsWrappedCurrency {
			return id
		}
	}

	if !isNativeTokenOnSrc {
		if currencyID, err := m.appConfig.SkylineBridgingSettings.GetCurrencyID(chainID); err == nil {
			return currencyID
		}
	}

	return 0
}

func (m *Manager) resolveSolanaTokenID(chainID string, mint string) (uint16, bool) {
	tokens, err := m.appConfig.SkylineBridgingSettings.GetTokens(chainID)
	if err != nil {
		return 0, false
	}

	for id, token := range tokens {
		if token.ChainSpecific == mint {
			return id, true
		}
	}

	return 0, false
}
