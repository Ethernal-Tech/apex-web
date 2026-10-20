package txindexer

import (
	"errors"
	"testing"
	"time"

	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/require"
)

func TestTelemetryWorker_Execute(t *testing.T) {
	position := uint64(0)
	worker := newTelemetryWorker(map[string]latestPositionFn{
		"prime": func() (uint64, error) { return position, nil },
		"nexus": func() (uint64, error) { return 0, errors.New("db closed") },
	}, time.Second, hclog.NewNullLogger())

	// nothing indexed yet
	worker.execute()
	require.Empty(t, worker.latest)

	position = 10

	worker.execute()
	require.Equal(t, map[string]uint64{"prime": 10}, worker.latest)

	position = 15

	worker.execute()
	require.Equal(t, map[string]uint64{"prime": 15}, worker.latest)
}

func TestManager_CardanoLatestPosition(t *testing.T) {
	m := &Manager{store: newTestStore(t)}
	getPosition := m.cardanoLatestPosition("prime")

	position, err := getPosition()
	require.NoError(t, err)
	require.Zero(t, position)

	require.NoError(t, m.store.SetCardanoBlockPoints("prime", []cardanoBlockPoint{{Slot: 5}, {Slot: 9}}))

	position, err = getPosition()
	require.NoError(t, err)
	require.Equal(t, uint64(9), position)
}
