package txindexer

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer/gouroboros"
	"github.com/hashicorp/go-hclog"
)

const (
	cardanoSyncerRestartDelay = 5 * time.Second
	cardanoSyncerKeepAlive    = true
	cardanoSyncStartTries     = 4
)

// BridgingAddressesProvider returns the current bridging addresses of a cardano chain
type BridgingAddressesProvider func(ctx context.Context, chainID string) ([]string, error)

// TokenIDResolver resolves token ID for metadata written before token IDs were introduced
type TokenIDResolver func(chainID string, isNativeTokenOnSrc bool) uint16

// cardanoIndexer follows a cardano chain with the block indexer from cardano-infrastructure.
//
// Every block is processed as soon as it is received (no confirmations) and rollbacks of already
// processed blocks are allowed. They are harmless here - txs from the abandoned fork are either
// included again (and seen again) or never reach the oracle and expire by their TTL on web-api.
type cardanoIndexer struct {
	config       *core.CardanoIndexerConfig
	networkMagic uint32
	db           indexer.Database
	blockIndexer *indexer.BlockIndexer
	txsStore     BridgingTxsStore
	getAddresses BridgingAddressesProvider
	resolveID    TokenIDResolver
	logger       hclog.Logger
	syncerLogger hclog.Logger

	addressesLock sync.RWMutex
	addresses     map[string]struct{}

	closeCh         chan struct{}
	closeOnce       sync.Once
	syncerCloseLock sync.Mutex
	syncer          *gouroboros.BlockSyncerImpl
}

func newCardanoIndexer(
	config *core.CardanoIndexerConfig, networkMagic uint32, db indexer.Database, txsStore BridgingTxsStore,
	getAddresses BridgingAddressesProvider, resolveID TokenIDResolver, logger, syncerLogger hclog.Logger,
) *cardanoIndexer {
	ci := &cardanoIndexer{
		config:       config,
		networkMagic: networkMagic,
		db:           db,
		txsStore:     txsStore,
		getAddresses: getAddresses,
		resolveID:    resolveID,
		logger:       logger,
		syncerLogger: syncerLogger,
		closeCh:      make(chan struct{}),
	}

	// addresses of interest are added before syncing starts. Without them every tx would be of interest
	ci.blockIndexer = indexer.NewBlockIndexer(&indexer.BlockIndexerConfig{
		StartingBlockPoint: &indexer.BlockPoint{
			BlockSlot: config.StartSlot,
			BlockHash: indexer.NewHashFromHexString(config.StartBlockHash),
		},
		ConfirmationBlockCount: 0,
		AddressCheck:           indexer.AddressCheckOutputs,
		AllowDeepRollback:      true,
	}, ci.processConfirmedTxs, db, syncerLogger.Named("block_indexer"))

	return ci
}

func (ci *cardanoIndexer) setAddresses(addresses []string) {
	addressesMap := make(map[string]struct{}, len(addresses))

	for _, addr := range addresses {
		if addr = strings.TrimSpace(addr); addr != "" {
			addressesMap[addr] = struct{}{}
		}
	}

	ci.addressesLock.Lock()
	ci.addresses = addressesMap
	ci.addressesLock.Unlock()

	ci.blockIndexer.AddNewAddressesOfInterest(slices.Collect(maps.Keys(addressesMap))...)
}

func (ci *cardanoIndexer) getCurrentAddresses() map[string]struct{} {
	ci.addressesLock.RLock()
	defer ci.addressesLock.RUnlock()

	return ci.addresses
}

func (ci *cardanoIndexer) processConfirmedTxs(_ *indexer.CardanoBlock, _ []*indexer.Tx) error {
	// same as in apex-bridge: all unprocessed txs are read from the db, so txs of a previously failed call
	// are not lost
	txs, err := ci.db.GetUnprocessedConfirmedTxs(0)
	if err != nil {
		return err
	}

	addresses := ci.getCurrentAddresses()
	bridgingTxs := make([]*BridgingTx, 0)

	for _, tx := range txs {
		if bridgingTx := ci.toBridgingTx(tx, addresses); bridgingTx != nil {
			bridgingTxs = append(bridgingTxs, bridgingTx)
		}
	}

	if err := ci.txsStore.AddBridgingTxs(bridgingTxs); err != nil {
		return fmt.Errorf("could not save bridging txs: %w", err)
	}

	for _, tx := range bridgingTxs {
		ci.logger.Info("New bridging tx", "chain", ci.config.ChainID, "hash", tx.TxHash, "slot", tx.BlockNumber)
	}

	return ci.db.MarkConfirmedTxsProcessed(txs)
}

func (ci *cardanoIndexer) toBridgingTx(tx *indexer.Tx, addresses map[string]struct{}) *BridgingTx {
	var value uint64

	for _, out := range tx.Outputs {
		if _, exists := addresses[out.Address]; exists {
			value += out.Amount
		}
	}

	if value == 0 {
		return nil
	}

	metadata, err := parseBridgingRequestMetadata(tx.Metadata)
	if err != nil || metadata == nil {
		ci.logger.Debug("Tx to bridging address is not a bridging request",
			"chain", ci.config.ChainID, "hash", tx.Hash, "err", err)

		return nil
	}

	receivers := make([]BridgingTxReceiver, len(metadata.Transactions))

	for i, receiver := range metadata.Transactions {
		tokenID := receiver.TokenID
		if tokenID == 0 && ci.resolveID != nil {
			tokenID = ci.resolveID(ci.config.ChainID, receiver.IsNativeTokenOnSrc_Obsolete != 0)
		}

		receivers[i] = BridgingTxReceiver{
			Address: metadataAddrToAddr(metadata.DestinationChainID, receiver.Address),
			Amount:  strconv.FormatUint(receiver.Amount, 10),
			TokenID: tokenID,
		}
	}

	return &BridgingTx{
		OriginChainID:      ci.config.ChainID,
		TxHash:             tx.Hash.String(),
		DestinationChainID: metadata.DestinationChainID,
		SenderAddr:         strings.Join(metadata.SenderAddr, ""),
		Receivers:          receivers,
		BridgingFee:        strconv.FormatUint(metadata.BridgingFee, 10),
		OperationFee:       strconv.FormatUint(metadata.OperationFee, 10),
		Value:              strconv.FormatUint(value, 10),
		BlockNumber:        tx.BlockSlot,
		BlockHash:          tx.BlockHash.String(),
		TTL:                tx.BlockSlot + ci.config.TTLSlotNumberInc,
	}
}

// metadataAddrToAddr joins an address split into metadata chunks. EVM addresses are written to
// metadata without the 0x prefix (sendtx.AddrToMetaDataAddr), so the prefix is restored for them
func metadataAddrToAddr(chainID string, chunks []string) string {
	addr := strings.Join(chunks, "")

	if common.IsEvmChainID(chainID) && !strings.HasPrefix(addr, "0x") && !strings.HasPrefix(addr, "0X") {
		return "0x" + addr
	}

	return addr
}

func (ci *cardanoIndexer) Start(ctx context.Context) {
	// bridging addresses must be known before any block is processed, otherwise txs would be missed
	ci.refreshAddresses(ctx, true)

	go ci.refreshAddressesLoop(ctx)

	for {
		syncer := gouroboros.NewBlockSyncer(&gouroboros.BlockSyncerConfig{
			NetworkMagic:   ci.networkMagic,
			NodeAddress:    ci.config.NetworkAddress,
			RestartOnError: true,
			RestartDelay:   cardanoSyncerRestartDelay,
			SyncStartTries: cardanoSyncStartTries,
			KeepAlive:      cardanoSyncerKeepAlive,
		}, ci.blockIndexer, ci.syncerLogger.Named("block_syncer"))

		ci.syncerCloseLock.Lock()
		ci.syncer = syncer
		ci.syncerCloseLock.Unlock()

		if err := syncer.Sync(); err != nil {
			ci.logger.Error("Failed to start syncer", "chain", ci.config.ChainID, "err", err)
		} else {
			select {
			case <-ctx.Done():
			case <-ci.closeCh:
			case err := <-syncer.ErrorCh():
				ci.logger.Error("Syncer stopped", "chain", ci.config.ChainID, "err", err)
			}
		}

		_ = syncer.Close()

		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(cardanoSyncerRestartDelay):
		}
	}
}

func (ci *cardanoIndexer) Close() {
	ci.closeOnce.Do(func() {
		close(ci.closeCh)

		ci.syncerCloseLock.Lock()
		defer ci.syncerCloseLock.Unlock()

		if ci.syncer != nil {
			_ = ci.syncer.Close()
		}
	})
}

func (ci *cardanoIndexer) refreshAddressesLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(ci.config.AddressesRefreshInterval):
			ci.refreshAddresses(ctx, false)
		}
	}
}

func (ci *cardanoIndexer) refreshAddresses(ctx context.Context, untilSuccess bool) {
	for {
		addresses, err := ci.getAddresses(ctx, ci.config.ChainID)
		if err == nil && len(addresses) > 0 {
			ci.setAddresses(addresses)
			ci.logger.Debug("Bridging addresses refreshed", "chain", ci.config.ChainID, "addresses", addresses)

			return
		}

		ci.logger.Warn("Failed to retrieve bridging addresses", "chain", ci.config.ChainID, "err", err)

		if !untilSuccess {
			return
		}

		select {
		case <-ctx.Done():
			return
		case <-ci.closeCh:
			return
		case <-time.After(cardanoSyncerRestartDelay):
		}
	}
}
