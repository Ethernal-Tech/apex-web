package txindexer

import (
	"errors"
	"testing"

	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/indexer"
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

func newTestCardanoHandler(t *testing.T) (*cardanoBlockHandler, *BBoltStore) {
	t.Helper()

	store := newTestStore(t)
	config := &core.CardanoIndexerConfig{
		ChainID:          "prime",
		StartSlot:        5,
		StartBlockHash:   "0505",
		ResumeBlockDepth: 2,
		TTLSlotNumberInc: 100,
	}

	handler, err := newCardanoBlockHandler(config, store, store, func(string, bool) uint16 { return 1 }, hclog.NewNullLogger())
	require.NoError(t, err)

	handler.setAddresses([]string{testBridgingAddr})

	return handler, store
}

func testHeader(slot uint64, hashByte byte) indexer.BlockHeader {
	return indexer.BlockHeader{Slot: slot, Hash: indexer.Hash{hashByte}}
}

func TestCardanoBlockHandler_RollForward(t *testing.T) {
	handler, store := newTestCardanoHandler(t)
	metadata := testBridgingMetadata(t, func(m map[int]any) any { return m })

	bridgingTx := &indexer.Tx{
		Hash:     indexer.Hash{0xaa},
		Metadata: metadata,
		Outputs: []*indexer.TxOutput{
			{Address: testBridgingAddr, Amount: 1_500_000},
			{Address: testOtherAddr, Amount: 99},
		},
	}
	retriever := &testTxsRetriever{txs: map[indexer.Hash][]*indexer.Tx{
		{1}: {
			bridgingTx,
			// metadata, but nothing sent to the bridging address
			{Hash: indexer.Hash{0xbb}, Metadata: metadata, Outputs: []*indexer.TxOutput{{Address: testOtherAddr, Amount: 5}}},
			// sent to the bridging address without metadata (e.g. hot wallet funding)
			{Hash: indexer.Hash{0xcc}, Outputs: []*indexer.TxOutput{{Address: testBridgingAddr, Amount: 5}}},
		},
		{2}: {},
		{3}: {bridgingTx},
	}}

	require.NoError(t, handler.RollForward(testHeader(10, 1), retriever))

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

	// already processed block is skipped without retrieving txs
	require.NoError(t, handler.RollForward(testHeader(10, 1), retriever))
	require.Equal(t, 1, retriever.calls)

	require.NoError(t, handler.RollForward(testHeader(11, 2), retriever))

	// rollback to slot 10: the tx is included again in another block of the new fork
	require.NoError(t, handler.RollBackward(indexer.BlockPoint{BlockSlot: 10, BlockHash: indexer.Hash{1}}))
	require.NoError(t, handler.RollForward(testHeader(11, 3), retriever))

	page, err = store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 1)
	require.Equal(t, uint64(11), page.Txs[0].BlockNumber)
	require.Equal(t, indexer.Hash{3}.String(), page.Txs[0].BlockHash)

	// block from the abandoned fork is removed from the known points
	require.Equal(t, []cardanoBlockPoint{{Slot: 10, Hash: indexer.Hash{1}}, {Slot: 11, Hash: indexer.Hash{3}}}, handler.points)
}

func TestCardanoBlockHandler_NoAddresses(t *testing.T) {
	handler, _ := newTestCardanoHandler(t)
	handler.setAddresses(nil)

	err := handler.RollForward(testHeader(10, 1), &testTxsRetriever{})
	require.ErrorIs(t, err, errNoBridgingAddresses)
}

func TestCardanoBlockHandler_Reset(t *testing.T) {
	handler, store := newTestCardanoHandler(t)
	retriever := &testTxsRetriever{txs: map[indexer.Hash][]*indexer.Tx{}}

	// no known blocks -> configured starting point
	point, err := handler.Reset()
	require.NoError(t, err)
	require.Equal(t, uint64(5), point.BlockSlot)

	for i := byte(1); i <= 6; i++ {
		retriever.txs[indexer.Hash{i}] = nil
		require.NoError(t, handler.RollForward(testHeader(uint64(i)*10, i), retriever))
	}

	// only 2 * resumeBlockDepth points are kept
	require.Len(t, handler.points, 4)

	// points are persisted, so a new handler (restart) resumes from them
	handler, err = newCardanoBlockHandler(handler.config, store, store, nil, hclog.NewNullLogger())
	require.NoError(t, err)

	expectedSlots := []uint64{40, 40, 30, 5}
	for _, slot := range expectedSlots {
		point, err := handler.Reset()
		require.NoError(t, err)
		require.Equal(t, slot, point.BlockSlot)
	}

	// successful sync resets the fallback
	handler.setAddresses([]string{testBridgingAddr})

	retriever.txs[indexer.Hash{7}] = nil
	require.NoError(t, handler.RollForward(testHeader(70, 7), retriever))

	point, err = handler.Reset()
	require.NoError(t, err)
	require.Equal(t, uint64(50), point.BlockSlot)
}
