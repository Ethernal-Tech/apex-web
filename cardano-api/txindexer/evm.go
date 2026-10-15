package txindexer

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"time"

	eventStore "github.com/Ethernal-Tech/blockchain-event-tracker/store"
	eventTracker "github.com/Ethernal-Tech/blockchain-event-tracker/tracker"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/ethgo"
	"github.com/hashicorp/go-hclog"
)

// evmRescanStore wraps the event tracker store. Logs are tracked without confirmations, so a log
// moved to another block by a reorg could be missed. Periodically (and after every restart) the
// last processed block is reported as the safe block, so the tracker reads the blocks after it
// again. Tracker skips logs it already stored (same block hash, tx hash and log index), so only
// logs from replaced blocks are delivered again.
type evmRescanStore struct {
	eventStore.EventTrackerStore

	config     *core.EvmIndexerConfig
	getSafeNum func() (uint64, error)
	logger     hclog.Logger

	lock       sync.Mutex
	nextRescan time.Time
	rescanFrom *uint64
}

func (s *evmRescanStore) GetLastProcessedBlock() (uint64, error) {
	lastProcessed, err := s.EventTrackerStore.GetLastProcessedBlock()
	if err != nil {
		return 0, err
	}

	s.lock.Lock()
	defer s.lock.Unlock()

	// the rescan block is reported until the tracker processes something, because the tracker also
	// reads this value for logging only
	if now := time.Now().UTC(); s.rescanFrom == nil && !now.Before(s.nextRescan) {
		s.nextRescan = now.Add(s.config.RescanInterval)

		safeBlock, err := s.getSafeBlock(lastProcessed)
		if err != nil {
			s.logger.Warn("Failed to determine safe block, rescan skipped", "chain", s.config.ChainID, "err", err)
		} else if safeBlock < lastProcessed {
			s.logger.Debug("Rescanning blocks", "chain", s.config.ChainID, "from", safeBlock+1, "to", lastProcessed)
			s.rescanFrom = &safeBlock
		}
	}

	if s.rescanFrom != nil {
		return *s.rescanFrom, nil
	}

	return lastProcessed, nil
}

func (s *evmRescanStore) InsertLastProcessedBlock(blockNumber uint64) error {
	s.lock.Lock()
	s.rescanFrom = nil
	s.lock.Unlock()

	return s.EventTrackerStore.InsertLastProcessedBlock(blockNumber)
}

func (s *evmRescanStore) getSafeBlock(lastProcessed uint64) (uint64, error) {
	safeBlock := lastProcessed - min(lastProcessed, s.config.RescanNumBlockConfirmations)

	if s.config.RescanConfirmationStrategy == string(eventTracker.ConfirmationStrategyFinalized) {
		finalized, err := s.getSafeNum()
		if err != nil {
			return 0, err
		}

		safeBlock = min(finalized, lastProcessed)
	}

	// rescan is bounded, so a chain whose finality lags a lot does not cause too many RPC calls
	return max(safeBlock, lastProcessed-min(lastProcessed, s.config.RescanMaxBlocks)), nil
}

type evmLogSubscriber struct {
	config      *core.EvmIndexerConfig
	events      *evmEvents
	chainIDs    ChainIDConverter
	txsStore    BridgingTxsStore
	gatewayAddr ethgo.Address
	logger      hclog.Logger
}

var _ eventTracker.EventSubscriber = (*evmLogSubscriber)(nil)

func (s *evmLogSubscriber) AddLog(_ *big.Int, log *ethgo.Log) error {
	if log.Address != s.gatewayAddr {
		return nil
	}

	bridgingTx, err := s.withdrawToBridgingTx(log)
	if err != nil {
		// a log that can not be parsed will not become parsable later, so it is skipped
		s.logger.Error("Failed to parse log", "chain", s.config.ChainID, "tx", log.TransactionHash, "err", err)

		return nil
	}

	if err := s.txsStore.AddBridgingTxs([]*BridgingTx{bridgingTx}); err != nil {
		return fmt.Errorf("could not save bridging tx: %w", err)
	}

	s.logger.Info("New bridging tx", "chain", s.config.ChainID, "hash", bridgingTx.TxHash,
		"block", log.BlockNumber)

	return nil
}

func (s *evmLogSubscriber) withdrawToBridgingTx(log *ethgo.Log) (*BridgingTx, error) {
	withdraw, err := s.events.parseWithdraw(log)
	if err != nil {
		return nil, err
	}

	destinationChainID, err := s.chainIDs.ToChainIDStr(withdraw.DestinationChainID)
	if err != nil {
		return nil, err
	}

	receivers := make([]BridgingTxReceiver, len(withdraw.Receivers))
	for i, receiver := range withdraw.Receivers {
		receivers[i] = BridgingTxReceiver{
			Address: receiver.Receiver,
			Amount:  receiver.Amount.String(),
			TokenID: receiver.TokenId,
		}
	}

	return &BridgingTx{
		OriginChainID:      s.config.ChainID,
		TxHash:             log.TransactionHash.String(),
		DestinationChainID: destinationChainID,
		SenderAddr:         withdraw.Sender.Hex(),
		Receivers:          receivers,
		BridgingFee:        withdraw.Fee.String(),
		OperationFee:       withdraw.OperationFee.String(),
		Value:              withdraw.Value.String(),
		BlockNumber:        log.BlockNumber,
		BlockHash:          log.BlockHash.String(),
		TTL:                log.BlockNumber + s.config.TTLBlockNumberInc,
	}, nil
}

type evmIndexer struct {
	config   *core.EvmIndexerConfig
	store    eventStore.EventTrackerStore
	events   *evmEvents
	chainIDs ChainIDConverter
	txsStore BridgingTxsStore
	logger   hclog.Logger
	// logger for the event tracker library, which writes into the chain indexer log file
	trackerLogger hclog.Logger
}

func newEvmIndexer(
	config *core.EvmIndexerConfig, store eventStore.EventTrackerStore, chainIDs ChainIDConverter,
	txsStore BridgingTxsStore, logger, trackerLogger hclog.Logger,
) (*evmIndexer, error) {
	events, err := getEvmEvents()
	if err != nil {
		return nil, err
	}

	return &evmIndexer{
		config:        config,
		store:         store,
		events:        events,
		chainIDs:      chainIDs,
		txsStore:      txsStore,
		logger:        logger,
		trackerLogger: trackerLogger,
	}, nil
}

func (ei *evmIndexer) Start(ctx context.Context) {
	// same restart logic as in apex-bridge: the tracker is recreated if it stops progressing
	for {
		trackerCtx, cancelTracker := context.WithCancel(ctx)
		closedCh := make(chan struct{})

		lastBlock, _ := ei.store.GetLastProcessedBlock()

		go func() {
			defer close(closedCh)

			ei.runTracker(trackerCtx)
		}()

		for isAlive := true; isAlive; {
			select {
			case <-ctx.Done():
				cancelTracker()
				<-closedCh

				return
			case <-time.After(ei.config.RestartTrackerPullCheck):
				block, err := ei.store.GetLastProcessedBlock()

				switch {
				case err != nil:
					ei.logger.Warn("Failed to retrieve last processed block", "chain", ei.config.ChainID, "err", err)
				case block > lastBlock:
					lastBlock = block
				default:
					isAlive = false
				}
			}
		}

		ei.logger.Warn("Tracker is not alive anymore, restarting", "chain", ei.config.ChainID)

		cancelTracker()
		<-closedCh
	}
}

func (ei *evmIndexer) runTracker(ctx context.Context) {
	subscriber := &evmLogSubscriber{
		config:      ei.config,
		events:      ei.events,
		chainIDs:    ei.chainIDs,
		txsStore:    ei.txsStore,
		gatewayAddr: ethgo.HexToAddress(ei.config.GatewayAddress),
		logger:      ei.logger,
	}
	logFilter := map[ethgo.Address][]ethgo.Hash{
		subscriber.gatewayAddr: {ei.events.withdrawID, ei.events.withdrawReactorID},
	}

	trackerConfig := &eventTracker.EventTrackerConfig{
		RPCEndpoint:           ei.config.NodeURL,
		PollInterval:          time.Duration(ei.config.PoolIntervalMiliseconds) * time.Millisecond, //nolint:gosec
		SyncBatchSize:         ei.config.SyncBatchSize,
		ConfirmationStrategy:  eventTracker.ConfirmationStrategyNumBlockConfirmations,
		NumBlockConfirmations: 0,
		EventSubscriber:       subscriber,
		StartBlockFromGenesis: ei.config.StartBlockNumber,
		LogFilter:             logFilter,
		// add timestamp to the logger to differentiate between multiple instances (same as in apex-bridge)
		Logger: ei.trackerLogger.Named(time.Now().UTC().String()),
	}

	store := &evmRescanStore{
		EventTrackerStore: ei.store,
		config:            ei.config,
		logger:            ei.logger,
		getSafeNum: func() (uint64, error) {
			block, err := trackerConfig.Provider.GetBlockByNumber(ethgo.Finalized, false)
			if err != nil {
				return 0, err
			}

			if block == nil {
				return 0, fmt.Errorf("finalized block not found")
			}

			return block.Number, nil
		},
	}

	tracker, err := eventTracker.NewEventTracker(trackerConfig, store)
	if err != nil {
		ei.logger.Error("Failed to create event tracker", "chain", ei.config.ChainID, "err", err)

		return
	}

	tracker.Start(ctx)
}
