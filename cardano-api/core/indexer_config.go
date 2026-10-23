package core

import (
	"fmt"
	"strings"
	"time"

	"github.com/hashicorp/go-hclog"
)

const (
	defaultIndexerRetentionPeriod = 72 * time.Hour
	defaultIndexerPruneInterval   = time.Hour
	defaultIndexerPullLimit       = 500

	defaultCardanoAddressesRefreshInterval  = time.Minute
	defaultCardanoTTLSlotNumberInc          = 3600
	defaultEvmSyncBatchSize                 = 20
	defaultEvmPollIntervalMs                = 5000
	defaultEvmRestartTrackerPullCheck       = 150 * time.Second
	defaultEvmTTLBlockNumberInc             = 50
	defaultEvmRescanInterval                = 5 * time.Minute
	defaultEvmRescanMaxBlocks               = 200
	defaultEvmRescanNumBlockConfirmations   = 64
	evmConfirmationStrategyFinalized        = "finalized"
	evmConfirmationStrategyNumConfirmations = "numBlockConfirmations"
)

// IndexerConfig configures the bridging transaction indexers. When it is absent from the config,
// no indexer is started.
//
// Durations are in nanoseconds, like everywhere else in the config.
type IndexerConfig struct {
	// Directory where all indexer databases are stored
	DbsPath string `json:"dbsPath"`
	// Path to the chain IDs config file. Required for EVM indexing
	ChainIDsConfigPath string `json:"chainIDsConfigPath"`
	// How long indexed bridging transactions are kept before being pruned
	RetentionPeriod time.Duration `json:"retentionPeriod"`
	// How often old bridging transactions are pruned
	PruneInterval time.Duration `json:"pruneInterval"`
	// Maximum number of bridging transactions returned by one GetNew call
	PullLimit int `json:"pullLimit"`
	// Log level of the per-chain indexer log files (<chainID>-indexer.log). Defaults to the app log level
	LogLevel *hclog.Level `json:"logLevel,omitempty"`

	CardanoChains map[string]*CardanoIndexerConfig `json:"cardanoChains"`
	EthChains     map[string]*EvmIndexerConfig     `json:"ethChains"`
}

type CardanoIndexerConfig struct {
	ChainID string `json:"-"`
	// Cardano node address used for node-to-node chain sync ("host:port" or unix socket path)
	NetworkAddress string `json:"networkAddress"`
	// Starting point used only when the indexer database is empty
	StartSlot      uint64 `json:"startSlot"`
	StartBlockHash string `json:"startBlockHash"`
	// How often bridging addresses are refreshed from the oracle
	AddressesRefreshInterval time.Duration `json:"addressesRefreshInterval"`
	// Added to the slot of the block containing the tx to get an upper bound for its TTL
	TTLSlotNumberInc uint64 `json:"ttlSlotNumberIncrement"`
}

type EvmIndexerConfig struct {
	ChainID string `json:"-"`
	// Gateway contract address
	GatewayAddress          string        `json:"gatewayAddress"`
	NodeURL                 string        `json:"nodeUrl"`
	SyncBatchSize           uint64        `json:"syncBatchSize"`
	StartBlockNumber        uint64        `json:"startBlockNumber"`
	PoolIntervalMiliseconds uint64        `json:"poolIntervalMs"`
	RestartTrackerPullCheck time.Duration `json:"restartTrackerPullCheck"`
	// Added to the block number of the tx to get its TTL (same as ethTxTtlInc on web-api)
	TTLBlockNumberInc uint64 `json:"ttlBlockNumberInc"`
	// Logs are tracked without confirmations. Rescan periodically re-reads the blocks after the safe
	// block (finalized block or latest - rescanNumBlockConfirmations) to catch txs moved by reorgs
	RescanConfirmationStrategy  string        `json:"rescanConfirmationStrategy"`
	RescanNumBlockConfirmations uint64        `json:"rescanNumBlockConfirmations"`
	RescanInterval              time.Duration `json:"rescanInterval"`
	// Upper bound of blocks re-read by a single rescan
	RescanMaxBlocks uint64 `json:"rescanMaxBlocks"`
}

func (appConfig *AppConfig) fillOutIndexer() error {
	cfg := appConfig.Indexer
	if cfg == nil {
		return nil
	}

	if strings.TrimSpace(cfg.DbsPath) == "" {
		return fmt.Errorf("indexer: dbsPath is required")
	}

	cfg.RetentionPeriod = defaultIfZero(cfg.RetentionPeriod, defaultIndexerRetentionPeriod)
	cfg.PruneInterval = defaultIfZero(cfg.PruneInterval, defaultIndexerPruneInterval)
	cfg.PullLimit = defaultIfZero(cfg.PullLimit, defaultIndexerPullLimit)

	for chainID, chainCfg := range cfg.CardanoChains {
		chainCfg.ChainID = chainID

		if _, exists := appConfig.CardanoChains[chainID]; !exists {
			return fmt.Errorf("indexer: cardano chain %s is not defined in cardanoChains", chainID)
		}

		chainCfg.NetworkAddress = strings.TrimPrefix(
			strings.TrimPrefix(strings.TrimSpace(chainCfg.NetworkAddress), "http://"), "https://")
		if chainCfg.NetworkAddress == "" {
			return fmt.Errorf("indexer: networkAddress is required for chain %s", chainID)
		}

		chainCfg.AddressesRefreshInterval = defaultIfZero(
			chainCfg.AddressesRefreshInterval, defaultCardanoAddressesRefreshInterval)
		chainCfg.TTLSlotNumberInc = defaultIfZero(chainCfg.TTLSlotNumberInc, defaultCardanoTTLSlotNumberInc)
	}

	for chainID, chainCfg := range cfg.EthChains {
		chainCfg.ChainID = chainID

		if cfg.ChainIDsConfigPath == "" {
			return fmt.Errorf("indexer: chainIDsConfigPath is required for evm indexing")
		}

		if chainCfg.NodeURL == "" {
			return fmt.Errorf("indexer: nodeUrl is required for chain %s", chainID)
		}

		if chainCfg.GatewayAddress == "" {
			return fmt.Errorf("indexer: gatewayAddress is required for chain %s", chainID)
		}

		switch chainCfg.RescanConfirmationStrategy {
		case "":
			chainCfg.RescanConfirmationStrategy = evmConfirmationStrategyNumConfirmations
		case evmConfirmationStrategyFinalized, evmConfirmationStrategyNumConfirmations:
		default:
			return fmt.Errorf("indexer: invalid rescanConfirmationStrategy for chain %s", chainID)
		}

		chainCfg.SyncBatchSize = defaultIfZero(chainCfg.SyncBatchSize, defaultEvmSyncBatchSize)
		chainCfg.PoolIntervalMiliseconds = defaultIfZero(chainCfg.PoolIntervalMiliseconds, defaultEvmPollIntervalMs)
		chainCfg.RestartTrackerPullCheck = defaultIfZero(
			chainCfg.RestartTrackerPullCheck, defaultEvmRestartTrackerPullCheck)
		chainCfg.TTLBlockNumberInc = defaultIfZero(chainCfg.TTLBlockNumberInc, defaultEvmTTLBlockNumberInc)
		chainCfg.RescanInterval = defaultIfZero(chainCfg.RescanInterval, defaultEvmRescanInterval)
		chainCfg.RescanMaxBlocks = defaultIfZero(chainCfg.RescanMaxBlocks, defaultEvmRescanMaxBlocks)
		chainCfg.RescanNumBlockConfirmations = defaultIfZero(
			chainCfg.RescanNumBlockConfirmations, defaultEvmRescanNumBlockConfirmations)
	}

	return nil
}

func defaultIfZero[T comparable](value T, def T) T {
	var zero T
	if value == zero {
		return def
	}

	return value
}
