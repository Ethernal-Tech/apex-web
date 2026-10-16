package txindexer

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) *BBoltStore {
	t.Helper()

	store, err := NewBBoltStore(filepath.Join(t.TempDir(), "test.db"))
	require.NoError(t, err)

	t.Cleanup(func() { _ = store.Close() })

	return store
}

func TestBBoltStore_AddAndGet(t *testing.T) {
	store := newTestStore(t)

	require.NoError(t, store.AddBridgingTxs([]*BridgingTx{
		{OriginChainID: "prime", TxHash: "aa", BlockNumber: 10, BlockHash: "b10"},
		{OriginChainID: "nexus", TxHash: "aa", BlockNumber: 5, BlockHash: "b5"},
	}))

	// same hash on another block (rollback) keeps the sequence number, only location changes
	require.NoError(t, store.AddBridgingTxs([]*BridgingTx{
		{OriginChainID: "prime", TxHash: "aa", BlockNumber: 12, BlockHash: "b12", TTL: 100},
		{OriginChainID: "prime", TxHash: "bb", BlockNumber: 12, BlockHash: "b12"},
	}))

	page, err := store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 3)
	require.Equal(t, uint64(1), page.OldestSeq)
	require.Equal(t, uint64(3), page.CurrentSeq)

	require.Equal(t, uint64(1), page.Txs[0].Seq)
	require.Equal(t, "prime", page.Txs[0].OriginChainID)
	require.Equal(t, uint64(12), page.Txs[0].BlockNumber)
	require.Equal(t, "b12", page.Txs[0].BlockHash)
	require.Equal(t, uint64(100), page.Txs[0].TTL)
	require.Equal(t, "nexus", page.Txs[1].OriginChainID)
	require.Equal(t, "bb", page.Txs[2].TxHash)

	page, err = store.GetBridgingTxs(1, 1)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(2), page.Txs[0].Seq)

	page, err = store.GetBridgingTxs(3, 10)
	require.NoError(t, err)
	require.Empty(t, page.Txs)
}

func TestBBoltStore_Prune(t *testing.T) {
	store := newTestStore(t)
	now := time.Now().UTC()

	require.NoError(t, store.AddBridgingTxs([]*BridgingTx{
		{OriginChainID: "prime", TxHash: "a1", IndexedAt: now.Add(-3 * time.Hour)},
		{OriginChainID: "prime", TxHash: "a2", IndexedAt: now.Add(-2 * time.Hour)},
		{OriginChainID: "prime", TxHash: "a3", IndexedAt: now},
	}))

	cnt, err := store.PruneBridgingTxs(now.Add(-time.Hour))
	require.NoError(t, err)
	require.Equal(t, 2, cnt)

	page, err := store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(3), page.OldestSeq)

	// pruned hash is indexed again as a new tx
	require.NoError(t, store.AddBridgingTxs([]*BridgingTx{{OriginChainID: "prime", TxHash: "a1"}}))

	page, err = store.GetBridgingTxs(3, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(4), page.Txs[0].Seq)

	// the last tx is never pruned, so the store does not look empty
	cnt, err = store.PruneBridgingTxs(now.Add(time.Hour))
	require.NoError(t, err)
	require.Equal(t, 1, cnt)

	page, err = store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(4), page.OldestSeq)
}
