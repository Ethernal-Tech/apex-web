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

	defaultCardanoResumeBlockDepth          = 20
	defaultCardanoAddressesRefreshInterval  = time.Minute
	defaultCardanoTTLSlotNumberInc          = 3600
	defaultEvmSyncBatchSize                 = 20
	defaultEvmPollIntervalMs                = 5000
	defaultEvmRestartTrackerPullCheck       = 150 * time.Second
	defaultEvmTTLBlockNumberInc             = 50
	defaultEvmRescanInterval                = 5 * time.Minute
	defaultEvmRescanMaxBlocks               = 200
	defaultEvmRescanNumBlockConfirmations   = 64
	defaultSolanaRestartTrackerPullCheck    = 150 * time.Second
	defaultSolanaRetryTimeout               = 400 * time.Millisecond
	defaultSolanaTTLBlockNumberInc          = 150
	defaultSolanaCommitment                 = "confirmed"
	evmConfirmationStrategyFinalized        = "finalized"
	evmConfirmationStrategyNumConfirmations = "numBlockConfirmations"
)

// IndexerConfig configures the bridging transaction indexers. When it is absent from the config,
// no indexer is started.
//
// Per-chain JSON keys intentionally match the ones in apex-bridge oracle configs, so chain settings
// (especially RPC related ones which are sensitive to rate limits) can be copied over unchanged.
// Durations are in nanoseconds, like everywhere else in the config.
type IndexerConfig struct {
	// Directory where all indexer databases are stored
	DbsPath string `json:"dbsPath"`
	// Path to the chain IDs config file (same format as in apex-bridge). Required for EVM indexing
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
	SolanaChains  map[string]*SolanaIndexerConfig  `json:"solanaChains"`
}

type CardanoIndexerConfig struct {
	ChainID string `json:"-"`
	// Cardano node address used for node-to-node chain sync ("host:port" or unix socket path)
	NetworkAddress string `json:"networkAddress"`
	// Starting point used only when the indexer database is empty
	StartSlot      uint64 `json:"startSlot"`
	StartBlockHash string `json:"startBlockHash"`
	// How many blocks behind the last observed block the indexer resumes from after a restart
	ResumeBlockDepth int `json:"resumeBlockDepth"`
	// How often bridging addresses are refreshed from the oracle
	AddressesRefreshInterval time.Duration `json:"addressesRefreshInterval"`
	// Added to the slot of the block containing the tx to get an upper bound for its TTL
	TTLSlotNumberInc uint64 `json:"ttlSlotNumberIncrement"`
}

type EvmLayerZeroConfig struct {
	// OFT (or OFT adapter) contract address whose OFTSent events are tracked
	OFTAddress string `json:"oftAddress"`
	// LayerZero endpoint ID => chain ID
	EndpointIDs map[uint32]string `json:"endpointIDs"`
}

type EvmIndexerConfig struct {
	ChainID string `json:"-"`
	// Gateway contract address. Optional if only LayerZero is tracked on the chain
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
	// Optional LayerZero OFT tracking
	LayerZero *EvmLayerZeroConfig `json:"layerZero,omitempty"`
}

type SolanaIndexerConfig struct {
	ChainID string `json:"-"`
	// RPC endpoint. Defaults to chainSpecific.jsonRpcAddress of the solana chain
	TxProviderEndpoint string `json:"txProviderEndpoint"`
	// Bridge program. Defaults to chainSpecific.programID of the solana chain
	TrackedProgram string `json:"trackedProgram"`
	// "confirmed" or "finalized"
	Commitment                string        `json:"commitment"`
	SlotRoundingThreshold     uint64        `json:"slotRoundingThreshold"`
	RetryTimeoutMiliseconds   time.Duration `json:"retryTimeoutMs"`
	RestartTrackerPullCheck   time.Duration `json:"restartTrackerPullCheck"`
	TrackerStartSlot          uint64        `json:"trackerStartSlot"`
	DisableRateLimiting       bool          `json:"disableRateLimit"`
	RPCMethodLimitsConfigPath string        `json:"rpcMethodLimitsConfig,omitempty"`
	AvgSlotTime               time.Duration `json:"avgSlotTime"`
	ChainHeadTargetBlockCount uint64        `json:"chainHeadTargetBlockCount"`
	ChainHeadSlotOffset       uint64        `json:"chainHeadSlotOffset"`
	// Added to the block height of the tx to get an upper bound for its last valid block height
	TTLBlockNumberInc uint64 `json:"ttlBlockNumberInc"`
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

		if chainCfg.ResumeBlockDepth < 0 {
			return fmt.Errorf("indexer: invalid resumeBlockDepth for chain %s", chainID)
		}

		chainCfg.ResumeBlockDepth = defaultIfZero(chainCfg.ResumeBlockDepth, defaultCardanoResumeBlockDepth)
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

		if chainCfg.GatewayAddress == "" && (chainCfg.LayerZero == nil || chainCfg.LayerZero.OFTAddress == "") {
			return fmt.Errorf("indexer: gatewayAddress or layerZero.oftAddress is required for chain %s", chainID)
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

	for chainID, chainCfg := range cfg.SolanaChains {
		chainCfg.ChainID = chainID

		solanaChainConfig, exists := appConfig.SolanaChains[chainID]
		if !exists || solanaChainConfig.ChainSpecific == nil {
			return fmt.Errorf("indexer: solana chain %s is not defined in solanaChains", chainID)
		}

		if chainCfg.TxProviderEndpoint == "" {
			chainCfg.TxProviderEndpoint = solanaChainConfig.ChainSpecific.JSONRPCAddress
		}

		if chainCfg.TrackedProgram == "" {
			chainCfg.TrackedProgram = solanaChainConfig.ChainSpecific.ProgramID
		}

		chainCfg.Commitment = defaultIfZero(chainCfg.Commitment, defaultSolanaCommitment)
		chainCfg.RetryTimeoutMiliseconds = defaultIfZero(chainCfg.RetryTimeoutMiliseconds, defaultSolanaRetryTimeout)
		chainCfg.RestartTrackerPullCheck = defaultIfZero(
			chainCfg.RestartTrackerPullCheck, defaultSolanaRestartTrackerPullCheck)
		chainCfg.TTLBlockNumberInc = defaultIfZero(chainCfg.TTLBlockNumberInc, defaultSolanaTTLBlockNumberInc)
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
