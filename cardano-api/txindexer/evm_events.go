package txindexer

import (
	"fmt"
	"math/big"
	"reflect"
	"strings"
	"sync"

	"github.com/Ethernal-Tech/ethgo"
	"github.com/ethereum/go-ethereum/accounts/abi"
	goEthCommon "github.com/ethereum/go-ethereum/common"
)

// Gateway Withdraw event is the bridging request on EVM chains.
// Reactor gateway emits the older version (without token IDs and operation fee).
const evmEventsABI = `[
{"anonymous":false,"name":"Withdraw","type":"event","inputs":[
	{"indexed":false,"name":"destinationChainId","type":"uint8"},
	{"indexed":false,"name":"sender","type":"address"},
	{"indexed":false,"name":"receivers","type":"tuple[]","components":[
		{"name":"receiver","type":"string"},{"name":"amount","type":"uint256"},{"name":"tokenId","type":"uint16"}]},
	{"indexed":false,"name":"fee","type":"uint256"},
	{"indexed":false,"name":"operationFee","type":"uint256"},
	{"indexed":false,"name":"value","type":"uint256"}]},
{"anonymous":false,"name":"WithdrawReactor","type":"event","inputs":[
	{"indexed":false,"name":"destinationChainId","type":"uint8"},
	{"indexed":false,"name":"sender","type":"address"},
	{"indexed":false,"name":"receivers","type":"tuple[]","components":[
		{"name":"receiver","type":"string"},{"name":"amount","type":"uint256"}]},
	{"indexed":false,"name":"feeAmount","type":"uint256"},
	{"indexed":false,"name":"value","type":"uint256"}]}
]`

type evmEvents struct {
	abi               abi.ABI
	withdrawID        ethgo.Hash
	withdrawReactorID ethgo.Hash
}

var getEvmEvents = sync.OnceValues(func() (*evmEvents, error) {
	parsed, err := abi.JSON(strings.NewReader(evmEventsABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse evm events abi: %w", err)
	}

	// event ID is computed from the signature, so the renamed reactor event still has the right topic
	withdrawReactor := parsed.Events["WithdrawReactor"]
	withdrawReactorID := abi.NewEvent("Withdraw", "Withdraw", false, withdrawReactor.Inputs).ID

	return &evmEvents{
		abi:               parsed,
		withdrawID:        ethgo.Hash(parsed.Events["Withdraw"].ID),
		withdrawReactorID: ethgo.Hash(withdrawReactorID),
	}, nil
})

type evmWithdrawReceiver struct {
	Receiver string
	Amount   *big.Int
	TokenId  uint16 //nolint:stylecheck
}

type evmWithdraw struct {
	DestinationChainID uint8
	Sender             goEthCommon.Address
	Receivers          []evmWithdrawReceiver
	Fee                *big.Int
	OperationFee       *big.Int
	Value              *big.Int
}

func (e *evmEvents) parseWithdraw(log *ethgo.Log) (*evmWithdraw, error) {
	if len(log.Topics) == 0 {
		return nil, fmt.Errorf("log without topics")
	}

	switch log.Topics[0] {
	case e.withdrawID:
		values, err := e.abi.Events["Withdraw"].Inputs.Unpack(log.Data)
		if err != nil {
			return nil, err
		}

		receivers, err := convertEvmReceivers(values[2])
		if err != nil {
			return nil, err
		}

		return &evmWithdraw{
			DestinationChainID: values[0].(uint8),               //nolint:forcetypeassert
			Sender:             values[1].(goEthCommon.Address), //nolint:forcetypeassert
			Receivers:          receivers,
			Fee:                values[3].(*big.Int), //nolint:forcetypeassert
			OperationFee:       values[4].(*big.Int), //nolint:forcetypeassert
			Value:              values[5].(*big.Int), //nolint:forcetypeassert
		}, nil
	case e.withdrawReactorID:
		values, err := e.abi.Events["WithdrawReactor"].Inputs.Unpack(log.Data)
		if err != nil {
			return nil, err
		}

		receivers, err := convertEvmReceivers(values[2])
		if err != nil {
			return nil, err
		}

		return &evmWithdraw{
			DestinationChainID: values[0].(uint8),               //nolint:forcetypeassert
			Sender:             values[1].(goEthCommon.Address), //nolint:forcetypeassert
			Receivers:          receivers,
			Fee:                values[3].(*big.Int), //nolint:forcetypeassert
			OperationFee:       big.NewInt(0),
			Value:              values[4].(*big.Int), //nolint:forcetypeassert
		}, nil
	default:
		return nil, fmt.Errorf("not a withdraw event: %s", log.Topics[0])
	}
}

func convertEvmReceivers(value any) ([]evmWithdrawReceiver, error) {
	slice := reflect.ValueOf(value)
	if slice.Kind() != reflect.Slice {
		return nil, fmt.Errorf("unexpected withdraw receivers type: %T", value)
	}

	receivers := make([]evmWithdrawReceiver, slice.Len())

	for i := range receivers {
		item := slice.Index(i)

		receiver, okReceiver := tupleField(item, "Receiver").(string)
		amount, okAmount := tupleField(item, "Amount").(*big.Int)

		if !okReceiver || !okAmount {
			return nil, fmt.Errorf("unexpected withdraw receiver: %v", item.Interface())
		}

		// reactor gateway does not have token IDs
		tokenID, _ := tupleField(item, "TokenId").(uint16)

		receivers[i] = evmWithdrawReceiver{Receiver: receiver, Amount: amount, TokenId: tokenID}
	}

	return receivers, nil
}

// tupleField returns a field of an abi decoded tuple (anonymous struct) or nil if it does not exist
func tupleField(tuple reflect.Value, name string) any {
	if tuple.Kind() != reflect.Struct {
		return nil
	}

	if field := tuple.FieldByName(name); field.IsValid() && field.CanInterface() {
		return field.Interface()
	}

	return nil
}
