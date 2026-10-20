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
	}, func() (uint64, bool, error) { return 0, false, nil }, time.Second, hclog.NewNullLogger())

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

func TestManager_UnpulledBridgingTxs(t *testing.T) {
	m := &Manager{store: newTestStore(t), pullProgress: &PullProgress{}}

	require.NoError(t, m.store.AddBridgingTxs([]*BridgingTx{
		{OriginChainID: "prime", TxHash: "a"},
		{OriginChainID: "prime", TxHash: "b"},
		{OriginChainID: "nexus", TxHash: "c"},
	}))

	// web-api has not pulled since start
	_, isKnown, err := m.unpulledBridgingTxs()
	require.NoError(t, err)
	require.False(t, isKnown)

	m.pullProgress.SetPulled(1)

	cnt, isKnown, err := m.unpulledBridgingTxs()
	require.NoError(t, err)
	require.True(t, isKnown)
	require.Equal(t, uint64(2), cnt)

	m.pullProgress.SetPulled(3)

	cnt, _, err = m.unpulledBridgingTxs()
	require.NoError(t, err)
	require.Zero(t, cnt)

	// cursor of a recreated store
	m.pullProgress.SetPulled(10)

	cnt, isKnown, err = m.unpulledBridgingTxs()
	require.NoError(t, err)
	require.True(t, isKnown)
	require.Zero(t, cnt)
}
