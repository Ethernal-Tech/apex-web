package txindexer

import (
	"errors"
	"path/filepath"
	"testing"

	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer"
	indexerbbolt "github.com/Ethernal-Tech/cardano-infrastructure/indexer/db/bbolt"
	"github.com/fxamacker/cbor/v2"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/require"
)

const (
	testBridgingAddr = "addr_test1bridging"
	testOtherAddr    = "addr_test1other"
)

type testTxsRetriever struct {
	txs   map[indexer.Hash][]*indexer.Tx
	calls int
}

func (r *testTxsRetriever) GetBlockTransactions(blockHeader indexer.BlockHeader) ([]*indexer.Tx, error) {
	r.calls++

	txs, exists := r.txs[blockHeader.Hash]
	if !exists {
		return nil, errors.New("block not found")
	}

	return txs, nil
}

func testBridgingMetadata(t *testing.T, wrap func(map[int]any) any) []byte {
	t.Helper()

	metadata := map[int]any{
		metadataMapKey: bridgingRequestMetadata{
			BridgingTxType:     bridgingTxTypeBridgingRequest,
			DestinationChainID: "nexus",
			SenderAddr:         []string{"addr_test1qsender", "part2"},
			Transactions: []bridgingRequestMetadataTransaction{
				{Address: []string{"0xreceiver"}, Amount: 1_000_000, TokenID: 3},
				{Address: []string{"0xreceiver2"}, Amount: 5},
			},
			BridgingFee:  200,
			OperationFee: 30,
		},
	}

	data, err := cbor.Marshal(wrap(metadata))
	require.NoError(t, err)

	return data
}

func TestParseBridgingRequestMetadata(t *testing.T) {
	for name, wrap := range map[string]func(map[int]any) any{
		"shelley":    func(m map[int]any) any { return m },
		"shelley-ma": func(m map[int]any) any { return []any{m, []any{}} },
		"alonzo":     func(m map[int]any) any { return cbor.Tag{Number: alonzoAuxiliaryDataTag, Content: map[int]any{0: m}} },
	} {
		t.Run(name, func(t *testing.T) {
			metadata, err := parseBridgingRequestMetadata(testBridgingMetadata(t, wrap))
			require.NoError(t, err)
			require.NotNil(t, metadata)
			require.Equal(t, "nexus", metadata.DestinationChainID)
			require.Len(t, metadata.Transactions, 2)
		})
	}

	t.Run("not bridging request", func(t *testing.T) {
		data, err := cbor.Marshal(map[int]any{metadataMapKey: map[string]any{"t": "batch", "n": 1}})
		require.NoError(t, err)

		metadata, err := parseBridgingRequestMetadata(data)
		require.NoError(t, err)
		require.Nil(t, metadata)
	})

	t.Run("other label", func(t *testing.T) {
		data, err := cbor.Marshal(map[int]any{674: map[string]any{"msg": []string{"hello"}}})
		require.NoError(t, err)

		_, err = parseBridgingRequestMetadata(data)
		require.Error(t, err)
	})
}

func newTestCardanoIndexer(t *testing.T) (*cardanoIndexer, *indexerbbolt.BBoltDatabase, *BBoltStore) {
	t.Helper()

	db := &indexerbbolt.BBoltDatabase{}
	require.NoError(t, db.Init(filepath.Join(t.TempDir(), "cardano.db")))

	t.Cleanup(func() { _ = db.Close() })

	store := newTestStore(t)
	config := &core.CardanoIndexerConfig{
		ChainID:          "prime",
		StartSlot:        5,
		StartBlockHash:   "0505",
		TTLSlotNumberInc: 100,
	}

	ci := newCardanoIndexer(config, 0, db, store, nil,
		func(string, bool) uint16 { return 1 }, hclog.NewNullLogger(), hclog.NewNullLogger())
	ci.setAddresses([]string{testBridgingAddr})

	return ci, db, store
}

func testHeader(slot uint64, hashByte byte) indexer.BlockHeader {
	return indexer.BlockHeader{Slot: slot, Hash: indexer.Hash{hashByte}}
}

func testTx(header indexer.BlockHeader, tx indexer.Tx) *indexer.Tx {
	tx.BlockSlot, tx.BlockHash = header.Slot, header.Hash

	return &tx
}

func TestCardanoIndexer_RollForward(t *testing.T) {
	ci, db, store := newTestCardanoIndexer(t)
	metadata := testBridgingMetadata(t, func(m map[int]any) any { return m })
	bridgingTx := indexer.Tx{
		Hash:     indexer.Hash{0xaa},
		Metadata: metadata,
		Outputs: []*indexer.TxOutput{
			{Address: testBridgingAddr, Amount: 1_500_000},
			{Address: testOtherAddr, Amount: 99},
		},
	}
	retriever := &testTxsRetriever{txs: map[indexer.Hash][]*indexer.Tx{
		{1}: {
			testTx(testHeader(10, 1), bridgingTx),
			// metadata, but nothing sent to the bridging address
			testTx(testHeader(10, 1), indexer.Tx{
				Indx: 1, Hash: indexer.Hash{0xbb}, Metadata: metadata,
				Outputs: []*indexer.TxOutput{{Address: testOtherAddr, Amount: 5}},
			}),
			// sent to the bridging address without metadata (e.g. hot wallet funding)
			testTx(testHeader(10, 1), indexer.Tx{
				Indx: 2, Hash: indexer.Hash{0xcc}, Outputs: []*indexer.TxOutput{{Address: testBridgingAddr, Amount: 5}},
			}),
		},
		{2}: {},
		{3}: {testTx(testHeader(11, 3), bridgingTx)},
	}}

	point, err := ci.blockIndexer.Reset()
	require.NoError(t, err)
	require.Equal(t, uint64(5), point.BlockSlot)

	require.NoError(t, ci.blockIndexer.RollForward(testHeader(10, 1), retriever))

	page, err := store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)

	tx := page.Txs[0]
	require.Equal(t, "prime", tx.OriginChainID)
	require.Equal(t, indexer.Hash{0xaa}.String(), tx.TxHash)
	require.Equal(t, "nexus", tx.DestinationChainID)
	require.Equal(t, "addr_test1qsenderpart2", tx.SenderAddr)
	require.Equal(t, []BridgingTxReceiver{
		{Address: "0xreceiver", Amount: "1000000", TokenID: 3},
		{Address: "0xreceiver2", Amount: "5", TokenID: 1}, // token ID resolved for old metadata
	}, tx.Receivers)
	require.Equal(t, "200", tx.BridgingFee)
	require.Equal(t, "30", tx.OperationFee)
	require.Equal(t, "1500000", tx.Value)
	require.Equal(t, uint64(10), tx.BlockNumber)
	require.Equal(t, uint64(110), tx.TTL)

	require.NoError(t, ci.blockIndexer.RollForward(testHeader(11, 2), retriever))

	// rollback of an already processed block: the tx is included again in another block of the new fork
	require.NoError(t, ci.blockIndexer.RollBackward(indexer.BlockPoint{BlockSlot: 10, BlockHash: indexer.Hash{1}}))
	require.NoError(t, ci.blockIndexer.RollForward(testHeader(11, 3), retriever))

	page, err = store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(11), page.Txs[0].BlockNumber)
	require.Equal(t, indexer.Hash{3}.String(), page.Txs[0].BlockHash)

	unprocessed, err := db.GetUnprocessedConfirmedTxs(0)
	require.NoError(t, err)
	require.Empty(t, unprocessed)

	latestPoint, err := db.GetLatestBlockPoint()
	require.NoError(t, err)
	require.Equal(t, indexer.BlockPoint{BlockSlot: 11, BlockHash: indexer.Hash{3}}, *latestPoint)
}

func TestCardanoIndexer_ProcessConfirmedTxs_Retry(t *testing.T) {
	ci, db, store := newTestCardanoIndexer(t)
	tx := testTx(testHeader(10, 1), indexer.Tx{
		Hash:     indexer.Hash{0xaa},
		Metadata: testBridgingMetadata(t, func(m map[int]any) any { return m }),
		Outputs:  []*indexer.TxOutput{{Address: testBridgingAddr, Amount: 1_500_000}},
	})

	// txs of a block whose processing failed stay unprocessed and are processed with the next block
	require.NoError(t, db.OpenTx().AddConfirmedTxs([]*indexer.Tx{tx}).Execute())
	require.NoError(t, ci.processConfirmedTxs(nil, nil))

	page, err := store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)

	unprocessed, err := db.GetUnprocessedConfirmedTxs(0)
	require.NoError(t, err)
	require.Empty(t, unprocessed)
}

func TestMetadataAddrToAddr(t *testing.T) {
	// EVM addresses are written to metadata without the 0x prefix
	require.Equal(t, "0xabcdef0123", metadataAddrToAddr("nexus", []string{"abcdef", "0123"}))
	require.Equal(t, "0xabcdef0123", metadataAddrToAddr("polygon", []string{"0xabcdef", "0123"}))
	require.Equal(t, "addr_test1qxyz", metadataAddrToAddr("vector", []string{"addr_test1", "qxyz"}))
}
