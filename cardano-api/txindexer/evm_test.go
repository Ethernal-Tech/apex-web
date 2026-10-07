package txindexer

import (
	"errors"
	"math/big"
	"testing"
	"time"

	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/ethgo"
	goEthCommon "github.com/ethereum/go-ethereum/common"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/require"
)

type testReceiver struct {
	Receiver string
	Amount   *big.Int
	TokenId  uint16 //nolint:stylecheck
}

type testReactorReceiver struct {
	Receiver string
	Amount   *big.Int
}

func TestEvmLogSubscriber_Withdraw(t *testing.T) {
	events, err := getEvmEvents()
	require.NoError(t, err)

	sender := goEthCommon.HexToAddress("0x1111111111111111111111111111111111111111")
	gateway := ethgo.HexToAddress("0x2222222222222222222222222222222222222222")

	skylineData, err := events.abi.Events["Withdraw"].Inputs.Pack(
		uint8(2), sender,
		[]testReceiver{{Receiver: "addr_test1receiver", Amount: big.NewInt(1000), TokenId: 4}},
		big.NewInt(30), big.NewInt(7), big.NewInt(1037))
	require.NoError(t, err)

	reactorData, err := events.abi.Events["WithdrawReactor"].Inputs.Pack(
		uint8(1), sender,
		[]testReactorReceiver{{Receiver: "addr_test1receiver", Amount: big.NewInt(500)}},
		big.NewInt(30), big.NewInt(530))
	require.NoError(t, err)

	store := newTestStore(t)
	subscriber := &evmLogSubscriber{
		config: &core.EvmIndexerConfig{
			ChainID: "nexus", GatewayAddress: gateway.String(), TTLBlockNumberInc: 50,
		},
		events:      events,
		chainIDs:    ChainIDConverter{1: "prime", 2: "vector"},
		txsStore:    store,
		gatewayAddr: gateway,
		logger:      hclog.NewNullLogger(),
	}

	logs := []*ethgo.Log{
		{
			Address: gateway, Topics: []ethgo.Hash{events.withdrawID}, Data: skylineData,
			BlockNumber: 100, BlockHash: ethgo.Hash{1}, TransactionHash: ethgo.Hash{0xaa},
		},
		{
			Address: gateway, Topics: []ethgo.Hash{events.withdrawReactorID}, Data: reactorData,
			BlockNumber: 101, BlockHash: ethgo.Hash{2}, TransactionHash: ethgo.Hash{0xbb},
		},
		// unparsable log is skipped
		{
			Address: gateway, Topics: []ethgo.Hash{events.withdrawID}, Data: []byte{1, 2, 3},
			BlockNumber: 102, BlockHash: ethgo.Hash{3}, TransactionHash: ethgo.Hash{0xcc},
		},
	}

	for _, log := range logs {
		require.NoError(t, subscriber.AddLog(nil, log))
	}

	page, err := store.GetBridgingTxs(0, 10)
	require.NoError(t, err)
	require.Len(t, page.Txs, 2)

	require.Equal(t, &BridgingTx{
		Seq:                1,
		OriginChainID:      "nexus",
		TxHash:             ethgo.Hash{0xaa}.String(),
		DestinationChainID: "vector",
		SenderAddr:         sender.Hex(),
		Receivers:          []BridgingTxReceiver{{Address: "addr_test1receiver", Amount: "1000", TokenID: 4}},
		BridgingFee:        "30",
		OperationFee:       "7",
		Value:              "1037",
		BlockNumber:        100,
		BlockHash:          ethgo.Hash{1}.String(),
		TTL:                150,
		IndexedAt:          page.Txs[0].IndexedAt,
	}, page.Txs[0])

	require.Equal(t, "prime", page.Txs[1].DestinationChainID)
	require.Equal(t, []BridgingTxReceiver{{Address: "addr_test1receiver", Amount: "500"}}, page.Txs[1].Receivers)
	require.Equal(t, "0", page.Txs[1].OperationFee)
	require.Equal(t, "530", page.Txs[1].Value)
}

func TestEvmEvents_OFT(t *testing.T) {
	events, err := getEvmEvents()
	require.NoError(t, err)

	from := goEthCommon.HexToAddress("0x3333333333333333333333333333333333333333")
	receiver := goEthCommon.HexToAddress("0x4444444444444444444444444444444444444444")

	data, err := events.abi.Events["OFTSent"].Inputs.NonIndexed().Pack(uint32(30101), big.NewInt(77), big.NewInt(70))
	require.NoError(t, err)

	oftSent, err := events.parseOFTSent(&ethgo.Log{
		Topics: []ethgo.Hash{events.oftSentID, {9}, ethgo.Hash(goEthCommon.BytesToHash(from.Bytes()))},
		Data:   data,
	})
	require.NoError(t, err)
	require.Equal(t, uint32(30101), oftSent.DstEid)
	require.Equal(t, from, oftSent.FromAddress)
	require.Equal(t, big.NewInt(77), oftSent.AmountSentLD)

	type sendParam struct {
		DstEid       uint32
		To           [32]byte
		AmountLD     *big.Int
		MinAmountLD  *big.Int
		ExtraOptions []byte
		ComposeMsg   []byte
		OftCmd       []byte
	}

	type messagingFee struct {
		NativeFee  *big.Int
		LzTokenFee *big.Int
	}

	input, err := events.abi.Pack("send",
		sendParam{
			DstEid: 30101, To: goEthCommon.BytesToHash(receiver.Bytes()), AmountLD: big.NewInt(77),
			MinAmountLD: big.NewInt(70), ExtraOptions: []byte{}, ComposeMsg: []byte{}, OftCmd: []byte{},
		},
		messagingFee{NativeFee: big.NewInt(1), LzTokenFee: big.NewInt(0)},
		from)
	require.NoError(t, err)

	require.Equal(t, receiver.Hex(), events.parseOFTSendReceiver(input))
	require.Equal(t, "", events.parseOFTSendReceiver([]byte{1, 2, 3, 4, 5}))
}

type testEventTrackerStore struct {
	lastProcessed uint64
}

func (s *testEventTrackerStore) GetLastProcessedBlock() (uint64, error) { return s.lastProcessed, nil }
func (s *testEventTrackerStore) InsertLastProcessedBlock(b uint64) error {
	s.lastProcessed = b

	return nil
}
func (s *testEventTrackerStore) InsertLogs([]*ethgo.Log) error { return nil }
func (s *testEventTrackerStore) GetLogsByBlockNumber(uint64) ([]*ethgo.Log, error) {
	return nil, nil
}
func (s *testEventTrackerStore) GetLog(uint64, uint64) (*ethgo.Log, error) { return nil, nil }
func (s *testEventTrackerStore) GetAllLogs() ([]*ethgo.Log, error)         { return nil, nil }

func TestEvmRescanStore(t *testing.T) {
	inner := &testEventTrackerStore{lastProcessed: 1000}
	finalized, finalizedErr := uint64(900), error(nil)

	store := &evmRescanStore{
		EventTrackerStore: inner,
		config: &core.EvmIndexerConfig{
			ChainID:                    "nexus",
			RescanConfirmationStrategy: "finalized",
			RescanInterval:             time.Hour,
			RescanMaxBlocks:            50,
		},
		getSafeNum: func() (uint64, error) { return finalized, finalizedErr },
		logger:     hclog.NewNullLogger(),
	}

	// rescan right after start, bounded by rescanMaxBlocks
	for range 2 {
		block, err := store.GetLastProcessedBlock()
		require.NoError(t, err)
		require.Equal(t, uint64(950), block)
	}

	require.NoError(t, store.InsertLastProcessedBlock(1010))

	block, err := store.GetLastProcessedBlock()
	require.NoError(t, err)
	require.Equal(t, uint64(1010), block)

	// next rescan uses finalized block when it is within bounds
	store.nextRescan = time.Time{}
	finalized = 990

	block, err = store.GetLastProcessedBlock()
	require.NoError(t, err)
	require.Equal(t, uint64(990), block)

	// failure to get the finalized block skips the rescan
	require.NoError(t, store.InsertLastProcessedBlock(1020))

	store.nextRescan = time.Time{}
	finalizedErr = errors.New("rpc error")

	block, err = store.GetLastProcessedBlock()
	require.NoError(t, err)
	require.Equal(t, uint64(1020), block)

	// numBlockConfirmations strategy
	store.config.RescanConfirmationStrategy = "numBlockConfirmations"
	store.config.RescanNumBlockConfirmations = 10
	store.nextRescan = time.Time{}

	block, err = store.GetLastProcessedBlock()
	require.NoError(t, err)
	require.Equal(t, uint64(1010), block)
}
