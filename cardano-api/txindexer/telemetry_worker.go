package txindexer

import (
	"context"
	"time"

	"github.com/Ethernal-Tech/cardano-api/telemetry"
	"github.com/hashicorp/go-hclog"
)

// latestPositionFn returns the latest block (slot) processed by the indexer of a chain
type latestPositionFn func() (uint64, error)

// telemetryWorker reports indexer progress the same way apex-bridge does: the block counter
// of a chain is increased whenever its indexer moves to a new block (slot)
type telemetryWorker struct {
	positions map[string]latestPositionFn
	latest    map[string]uint64
	pullTime  time.Duration
	logger    hclog.Logger
}

func newTelemetryWorker(
	positions map[string]latestPositionFn, pullTime time.Duration, logger hclog.Logger,
) *telemetryWorker {
	return &telemetryWorker{
		positions: positions,
		latest:    make(map[string]uint64, len(positions)),
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
}

func (m *Manager) cardanoLatestPosition(chainID string) latestPositionFn {
	return func() (uint64, error) {
		points, err := m.store.GetCardanoBlockPoints(chainID)
		if err != nil || len(points) == 0 {
			return 0, err
		}

		return points[len(points)-1].Slot, nil
	}
}
