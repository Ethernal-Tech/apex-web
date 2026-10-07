package txindexer

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"sync"
	"time"

	eventStore "github.com/Ethernal-Tech/blockchain-event-tracker/store"
	eventTracker "github.com/Ethernal-Tech/blockchain-event-tracker/tracker"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/ethgo"
	"github.com/Ethernal-Tech/ethgo/jsonrpc"
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

// errRetryable marks errors after which the log should be delivered again by the tracker
var errRetryable = errors.New("retryable error")

type evmLogSubscriber struct {
	config      *core.EvmIndexerConfig
	events      *evmEvents
	chainIDs    ChainIDConverter
	rpcClient   func() (*jsonrpc.Client, error)
	txsStore    BridgingTxsStore
	gatewayAddr ethgo.Address
	oftAddr     ethgo.Address
	logger      hclog.Logger
}

var _ eventTracker.EventSubscriber = (*evmLogSubscriber)(nil)

func (s *evmLogSubscriber) AddLog(_ *big.Int, log *ethgo.Log) error {
	var (
		bridgingTx *BridgingTx
		err        error
	)

	switch {
	case s.config.GatewayAddress != "" && log.Address == s.gatewayAddr:
		bridgingTx, err = s.withdrawToBridgingTx(log)
	case s.config.LayerZero != nil && log.Address == s.oftAddr:
		bridgingTx, err = s.oftSentToBridgingTx(log)
	default:
		return nil
	}

	if errors.Is(err, errRetryable) {
		return err
	} else if err != nil {
		// a log that can not be parsed will not become parsable later, so it is skipped
		s.logger.Error("Failed to parse log", "chain", s.config.ChainID, "tx", log.TransactionHash, "err", err)

		return nil
	}

	if bridgingTx == nil {
		return nil
	}

	if err := s.txsStore.AddBridgingTxs([]*BridgingTx{bridgingTx}); err != nil {
		return fmt.Errorf("could not save bridging tx: %w", err)
	}

	s.logger.Info("New bridging tx", "chain", s.config.ChainID, "hash", bridgingTx.TxHash,
		"block", log.BlockNumber, "layerZero", bridgingTx.IsLayerZero)

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

func (s *evmLogSubscriber) oftSentToBridgingTx(log *ethgo.Log) (*BridgingTx, error) {
	oftSent, err := s.events.parseOFTSent(log)
	if err != nil {
		return nil, err
	}

	destinationChainID, exists := s.config.LayerZero.EndpointIDs[oftSent.DstEid]
	if !exists {
		s.logger.Debug("OFTSent to untracked endpoint", "chain", s.config.ChainID,
			"tx", log.TransactionHash, "dstEid", oftSent.DstEid)

		return nil, nil
	}

	// receiver and tx value are not part of the event
	client, err := s.rpcClient()
	if err != nil {
		return nil, errors.Join(errRetryable, err)
	}

	tx, err := client.Eth().GetTransactionByHash(log.TransactionHash)
	if err != nil {
		return nil, errors.Join(errRetryable, fmt.Errorf("could not retrieve tx: %w", err))
	}

	if tx == nil {
		return nil, errors.Join(errRetryable, fmt.Errorf("tx %s not found", log.TransactionHash))
	}

	receiver := s.events.parseOFTSendReceiver(tx.Input)
	if receiver == "" {
		s.logger.Warn("Could not determine LayerZero receiver", "chain", s.config.ChainID, "tx", log.TransactionHash)
	}

	value := big.NewInt(0)
	if tx.Value != nil {
		value = tx.Value
	}

	return &BridgingTx{
		OriginChainID:      s.config.ChainID,
		TxHash:             log.TransactionHash.String(),
		DestinationChainID: destinationChainID,
		SenderAddr:         oftSent.FromAddress.Hex(),
		Receivers: []BridgingTxReceiver{
			{Address: receiver, Amount: oftSent.AmountSentLD.String()},
		},
		BridgingFee:  "0",
		OperationFee: "0",
		Value:        value.String(),
		BlockNumber:  log.BlockNumber,
		BlockHash:    log.BlockHash.String(),
		TTL:          log.BlockNumber + s.config.TTLBlockNumberInc,
		IsLayerZero:  true,
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

	rpcLock   sync.Mutex
	rpcClient *jsonrpc.Client
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
	logFilter := map[ethgo.Address][]ethgo.Hash{}
	subscriber := &evmLogSubscriber{
		config:    ei.config,
		events:    ei.events,
		chainIDs:  ei.chainIDs,
		rpcClient: ei.getRPCClient,
		txsStore:  ei.txsStore,
		logger:    ei.logger,
	}

	if ei.config.GatewayAddress != "" {
		subscriber.gatewayAddr = ethgo.HexToAddress(ei.config.GatewayAddress)
		logFilter[subscriber.gatewayAddr] = []ethgo.Hash{ei.events.withdrawID, ei.events.withdrawReactorID}
	}

	if ei.config.LayerZero != nil && ei.config.LayerZero.OFTAddress != "" {
		subscriber.oftAddr = ethgo.HexToAddress(ei.config.LayerZero.OFTAddress)
		logFilter[subscriber.oftAddr] = []ethgo.Hash{ei.events.oftSentID}
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

func (ei *evmIndexer) getRPCClient() (*jsonrpc.Client, error) {
	ei.rpcLock.Lock()
	defer ei.rpcLock.Unlock()

	if ei.rpcClient == nil {
		client, err := jsonrpc.NewClient(ei.config.NodeURL)
		if err != nil {
			return nil, fmt.Errorf("could not create rpc client: %w", err)
		}

		ei.rpcClient = client
	}

	return ei.rpcClient, nil
}
