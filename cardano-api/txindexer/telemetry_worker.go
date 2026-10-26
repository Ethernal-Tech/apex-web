package txindexer

import (
	"context"
	"time"

	"github.com/Ethernal-Tech/cardano-api/telemetry"
	"github.com/hashicorp/go-hclog"
)

// latestPositionFn returns the latest block (slot) processed by the indexer of a chain
type latestPositionFn func() (uint64, error)

// unpulledFn returns the number of indexed txs not pulled yet, false if it is not known yet
type unpulledFn func() (uint64, bool, error)

// the block counter of a chain is increased whenever its indexer moves to a new block (slot).
// It also reports how many indexed txs web-api has not pulled yet.
type telemetryWorker struct {
	positions map[string]latestPositionFn
	latest    map[string]uint64
	unpulled  unpulledFn
	pullTime  time.Duration
	logger    hclog.Logger
}

func newTelemetryWorker(
	positions map[string]latestPositionFn, unpulled unpulledFn, pullTime time.Duration, logger hclog.Logger,
) *telemetryWorker {
	return &telemetryWorker{
		positions: positions,
		latest:    make(map[string]uint64, len(positions)),
		unpulled:  unpulled,
		pullTime:  pullTime,
		logger:    logger,
	}
}

func (w *telemetryWorker) Start(ctx context.Context) {
	w.logger.Debug("Telemetry worker started", "pullTime", w.pullTime)

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(w.pullTime):
		}

		w.execute()
	}
}

func (w *telemetryWorker) execute() {
	for chainID, getPosition := range w.positions {
		position, err := getPosition()
		if err != nil {
			w.logger.Error("Failed to retrieve latest block", "chain", chainID, "err", err)

			continue
		}

		if position == 0 || position == w.latest[chainID] {
			continue
		}

		w.latest[chainID] = position

		telemetry.UpdateIndexersBlockCounter(chainID, 1)
	}

	cnt, isKnown, err := w.unpulled()
	if err != nil {
		w.logger.Error("Failed to retrieve number of unpulled bridging txs", "err", err)
	} else if isKnown {
		telemetry.UpdateBridgingTxsUnpulled(cnt)
	}
}

func (m *Manager) unpulledBridgingTxs() (uint64, bool, error) {
	pulledSeq, isKnown := m.pullProgress.GetPulled()
	if !isKnown {
		return 0, false, nil
	}

	currentSeq, err := m.store.GetCurrentSeq()
	if err != nil {
		return 0, false, err
	}

	// the client is ahead after the store was recreated, it starts from the beginning on its next pull
	if pulledSeq >= currentSeq {
		return 0, true, nil
	}

	return currentSeq - pulledSeq, true, nil
}
