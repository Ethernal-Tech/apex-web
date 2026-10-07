package txindexer

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	solanacommon "github.com/Ethernal-Tech/solana-infrastructure/common"
	skyline "github.com/Ethernal-Tech/solana-infrastructure/sendtx/skyline_program"
	"github.com/Ethernal-Tech/solana-infrastructure/tracker"
	solanaStore "github.com/Ethernal-Tech/solana-infrastructure/tracker/store"
	"github.com/hashicorp/go-hclog"
)

const (
	solanaBridgeRequestEvent = "BridgeRequestEvent"
	// same as in apex-bridge, gives the rpc endpoint time to cool down before (re)starting
	solanaTrackerStartDelay = 10 * time.Second
)

// SolanaTokenIDResolver returns token ID for a solana token mint
type SolanaTokenIDResolver func(chainID string, mint string) (uint16, bool)

type solanaEventSubscriber struct {
	config    *core.SolanaIndexerConfig
	txsStore  BridgingTxsStore
	resolveID SolanaTokenIDResolver
	logger    hclog.Logger
}

var _ tracker.EventSubscriber = (*solanaEventSubscriber)(nil)

func (s *solanaEventSubscriber) AddEvent(event tracker.EventNotification) error {
	if event.EventName != solanaBridgeRequestEvent {
		return nil
	}

	bridgeRequest, ok := event.EventData.(*skyline.BridgeRequestEvent)
	if !ok {
		s.logger.Error("Unexpected bridge request event data", "chain", s.config.ChainID, "tx", event.TxSignature)

		return nil
	}

	mint := bridgeRequest.MintToken.String()

	tokenID, found := s.resolveID(s.config.ChainID, mint)
	if !found {
		s.logger.Warn("Unknown token mint", "chain", s.config.ChainID, "tx", event.TxSignature, "mint", mint)
	}

	bridgingTx := &BridgingTx{
		OriginChainID:      s.config.ChainID,
		TxHash:             event.TxSignature.String(),
		DestinationChainID: bridgeRequest.DestinationChain,
		SenderAddr:         bridgeRequest.Sender.String(),
		Receivers: []BridgingTxReceiver{{
			Address: bridgeRequest.Receiver,
			Amount:  strconv.FormatUint(bridgeRequest.Amount, 10),
			TokenID: tokenID,
		}},
		BridgingFee:  strconv.FormatUint(bridgeRequest.BridgeFee, 10),
		OperationFee: strconv.FormatUint(bridgeRequest.OperationFee, 10),
		Value:        strconv.FormatUint(bridgeRequest.Value, 10),
		BlockNumber:  event.BlockNumber,
		TTL:          event.BlockNumber + s.config.TTLBlockNumberInc,
	}

	if err := s.txsStore.AddBridgingTxs([]*BridgingTx{bridgingTx}); err != nil {
		return fmt.Errorf("could not save bridging tx: %w", err)
	}

	s.logger.Info("New bridging tx", "chain", s.config.ChainID, "hash", bridgingTx.TxHash, "slot", event.SlotNumber)

	return nil
}

type solanaIndexer struct {
	config    *core.SolanaIndexerConfig
	store     solanaStore.StorageHandler
	txsStore  BridgingTxsStore
	resolveID SolanaTokenIDResolver
	logger    hclog.Logger
	// logger for the event tracker library, which writes into the chain indexer log file
	trackerLogger hclog.Logger
}

func newSolanaIndexer(
	config *core.SolanaIndexerConfig, store solanaStore.StorageHandler, txsStore BridgingTxsStore,
	resolveID SolanaTokenIDResolver, logger, trackerLogger hclog.Logger,
) *solanaIndexer {
	return &solanaIndexer{
		config:        config,
		store:         store,
		txsStore:      txsStore,
		resolveID:     resolveID,
		logger:        logger,
		trackerLogger: trackerLogger,
	}
}

func (si *solanaIndexer) Start(ctx context.Context) {
	// same restart logic as in apex-bridge: the tracker is recreated if it stops progressing
	for {
		trackerCtx, cancelTracker := context.WithCancel(ctx)
		closedCh := make(chan struct{})

		lastSlot := si.latestSlot()

		go func() {
			defer close(closedCh)

			si.runTracker(trackerCtx)
		}()

		for isAlive := true; isAlive; {
			select {
			case <-ctx.Done():
				cancelTracker()
				<-closedCh

				return
			case <-time.After(si.config.RestartTrackerPullCheck):
				if slot := si.latestSlot(); slot > lastSlot {
					lastSlot = slot
				} else {
					isAlive = false
				}
			}
		}

		si.logger.Warn("Tracker is not alive anymore, restarting", "chain", si.config.ChainID)

		cancelTracker()
		<-closedCh
	}
}

func (si *solanaIndexer) latestSlot() uint64 {
	blockPoint, err := si.store.GetLatestBlockPoint()
	if err != nil || blockPoint == nil {
		return 0
	}

	return blockPoint.BlockSlot
}

func (si *solanaIndexer) runTracker(ctx context.Context) {
	trackerConfig, err := si.loadTrackerConfig()
	if err != nil {
		si.logger.Error("Failed to load tracker config", "chain", si.config.ChainID, "err", err)

		return
	}

	eventTracker, err := tracker.NewEventTracker(trackerConfig, si.store)
	if err != nil {
		si.logger.Error("Failed to create event tracker", "chain", si.config.ChainID, "err", err)

		return
	}

	select {
	case <-ctx.Done():
		return
	case <-time.After(solanaTrackerStartDelay):
	}

	eventTracker.Start(ctx)
}

func (si *solanaIndexer) loadTrackerConfig() (*tracker.EventTrackerConfig, error) {
	specs := tracker.ProgramEventSpecs{}

	if _, err := specs.AddEventSpec(&skyline.BridgeRequestEvent{}, solanaBridgeRequestEvent); err != nil {
		return nil, err
	}

	var rpcMethodLimits *solanacommon.RPCMethodLimitsConfig

	if si.config.RPCMethodLimitsConfigPath != "" {
		limits, err := common.LoadJSON[solanacommon.RPCMethodLimitsConfig](si.config.RPCMethodLimitsConfigPath)
		if err != nil {
			return nil, fmt.Errorf("failed to load rpc method limits config: %w", err)
		}

		rpcMethodLimits = limits
	}

	return &tracker.EventTrackerConfig{
		RPCEndpoint:            si.config.TxProviderEndpoint,
		TrackedPrograms:        map[string]tracker.ProgramEventSpecs{si.config.TrackedProgram: specs},
		Commitment:             si.config.Commitment,
		RetryTimeout:           si.config.RetryTimeoutMiliseconds,
		BlockRoundingThreshold: si.config.SlotRoundingThreshold,
		EventSubscriber:        &solanaEventSubscriber{si.config, si.txsStore, si.resolveID, si.logger},
		StartFromSlot:          si.config.TrackerStartSlot,
		// add timestamp to the logger to differentiate between multiple instances (same as in apex-bridge)
		Logger:                    si.trackerLogger.Named(time.Now().UTC().String()),
		DisableRateLimiting:       si.config.DisableRateLimiting,
		RPCMethodLimitsConfig:     rpcMethodLimits,
		AvgSlotTime:               si.config.AvgSlotTime,
		ChainHeadTargetBlockCount: si.config.ChainHeadTargetBlockCount,
		ChainHeadSlotOffset:       si.config.ChainHeadSlotOffset,
	}, nil
}
