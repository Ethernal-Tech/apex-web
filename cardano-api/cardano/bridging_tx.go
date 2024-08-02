package cardanotx

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Ethernal-Tech/cardano-api/common"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

const (
	splitStringLength = 40
	potentialFee      = 250_000

	retryWait       = time.Millisecond * 1000
	retriesMaxCount = 10

	retriesTxHashInUtxosCount = 60
	retriesTxHashInUtxosWait  = time.Millisecond * 4000
)

type BridgingTxSender struct {
	cardanoCliBinary   string
	TxProviderSrc      cardanowallet.ITxProvider
	TxUtxoRetrieverDst cardanowallet.IUTxORetriever
	MultiSigAddrSrc    string
	TestNetMagicSrc    uint
	PotentialFee       uint64
	TTLSlotNumberInc   uint64
	ProtocolParameters []byte
}

func NewBridgingTxSender(
	cardanoCliBinary string,
	txProvider cardanowallet.ITxProvider,
	txUtxoRetriever cardanowallet.IUTxORetriever,
	testNetMagic uint,
	multiSigAddr string,
	ttlSlotNumberInc uint64,
) *BridgingTxSender {
	return &BridgingTxSender{
		cardanoCliBinary:   cardanoCliBinary,
		TxProviderSrc:      txProvider,
		TxUtxoRetrieverDst: txUtxoRetriever,
		TestNetMagicSrc:    testNetMagic,
		MultiSigAddrSrc:    multiSigAddr,
		PotentialFee:       potentialFee,
		TTLSlotNumberInc:   ttlSlotNumberInc,
	}
}

// CreateTx creates tx and returns cbor of raw transaction data, tx hash and error
func (bts *BridgingTxSender) CreateTx(
	ctx context.Context,
	chain string,
	senderAddr string,
	receivers []cardanowallet.TxOutput,
	feeAmount uint64,
) ([]byte, string, uint64, error) {
	qtd, err := bts.TxProviderSrc.GetTip(ctx)
	if err != nil {
		return nil, "", 0, err
	}

	protocolParams := bts.ProtocolParameters
	if protocolParams == nil {
		protocolParams, err = bts.TxProviderSrc.GetProtocolParameters(ctx)
		if err != nil {
			return nil, "", 0, err
		}
	}

	metadata, err := bts.createMetadata(chain, senderAddr, receivers, feeAmount)
	if err != nil {
		return nil, "", 0, err
	}

	outputsSum := cardanowallet.GetOutputsSum(receivers) + feeAmount
	outputs := []cardanowallet.TxOutput{
		{
			Addr:   bts.MultiSigAddrSrc,
			Amount: outputsSum,
		},
		{
			Addr: senderAddr,
		},
	}

	inputs, err := getUTXOsForAmount(
		ctx, bts.TxProviderSrc, senderAddr, outputsSum+bts.PotentialFee, cardanowallet.MinUTxODefaultValue)
	if err != nil {
		return nil, "", 0, err
	}

	builder, err := cardanowallet.NewTxBuilder(bts.cardanoCliBinary)
	if err != nil {
		return nil, "", 0, err
	}

	defer builder.Dispose()

	builder.SetMetaData(metadata).
		SetProtocolParameters(protocolParams).
		SetTimeToLive(qtd.Slot + bts.TTLSlotNumberInc).
		SetTestNetMagic(bts.TestNetMagicSrc).
		AddInputs(inputs.Inputs...).
		AddOutputs(outputs...)

	fee, err := builder.CalculateFee(0)
	if err != nil {
		return nil, "", 0, err
	}

	change := inputs.Sum - outputsSum - fee
	// handle overflow or insufficient amount
	if change > inputs.Sum || (change > 0 && change < cardanowallet.MinUTxODefaultValue) {
		return []byte{}, "", 0, fmt.Errorf("insufficient amount %d for %d or min utxo not satisfied",
			inputs.Sum, outputsSum+fee)
	}

	if change == 0 {
		builder.RemoveOutput(-1)
	} else {
		builder.UpdateOutputAmount(-1, change)
	}

	builder.SetFee(fee)

	txRawBytes, txHash, err := builder.Build()

	return txRawBytes, txHash, fee, err
}

/*
a TODO: notify crevar about this bug with amountSum == desired

// balance: 71_654_118
// utxos: 70_654_118, 1_000_000
// desired: 70_654_118 - outputsSum + potentialFee
// min utxo: 1_000_000

"amountSum" in getUTXOsForAmount == "inputs.Sum" in CreateTx
"desired" in getUTXOsForAmount == "outputsSum + potentialFee" in CreateTx
change := inputs.Sum - outputsSum - fee in CreateTx

if amountSum == desired
	=> inputs.Sum == outputsSum + potentialFee
	=> change := inputs.Sum - outputsSum - fee in CreateTx
	=> change := outputsSum + potentialFee - outputsSum - fee
	=> change := potentialFee - fee
	=> change is always less than utxoMinValue

but if there isn't a amountSum == desired condition, getUTXOsForAmount can take another utxo,
and everything is fine

*/

func getUTXOsForAmount(
	ctx context.Context, retriever cardanowallet.IUTxORetriever, addr string, desired uint64, minUtxo uint64,
) (cardanowallet.TxInputs, error) {
	utxos, err := retriever.GetUtxos(ctx, addr)
	if err != nil {
		return cardanowallet.TxInputs{}, err
	}

	// Loop through utxos to find first input with enough tokens
	// If we don't have this UTXO we need to use more of them
	//nolint:prealloc
	var (
		amountSum   = uint64(0)
		chosenUTXOs []cardanowallet.TxInput
	)

	for _, utxo := range utxos {
		amountSum += utxo.Amount
		chosenUTXOs = append(chosenUTXOs, cardanowallet.TxInput{
			Hash:  utxo.Hash,
			Index: utxo.Index,
		})

		if /*amountSum == desired || */ amountSum >= desired+minUtxo {
			return cardanowallet.TxInputs{
				Inputs: chosenUTXOs,
				Sum:    amountSum,
			}, nil
		}
	}

	return cardanowallet.TxInputs{}, fmt.Errorf(
		"not enough funds to generate the transaction: %d available vs %d required", amountSum, desired)
}

func (bts *BridgingTxSender) SendTx(
	ctx context.Context, txRaw []byte, txHash string, cardanoWallet cardanowallet.IWallet,
) error {
	builder, err := cardanowallet.NewTxBuilder(bts.cardanoCliBinary)
	if err != nil {
		return err
	}

	defer builder.Dispose()

	witness, err := cardanowallet.CreateTxWitness(txHash, cardanoWallet)
	if err != nil {
		return err
	}

	txSigned, err := builder.AssembleTxWitnesses(txRaw, [][]byte{witness})
	if err != nil {
		return err
	}

	return cardanowallet.ExecuteWithRetry(ctx, retriesMaxCount, retryWait, func() (bool, error) {
		err := bts.TxProviderSrc.SubmitTx(ctx, txSigned)

		return err == nil, err
	}, isRecoverableError)
}

func (bts *BridgingTxSender) WaitForTx(
	ctx context.Context, receivers []cardanowallet.TxOutput,
) error {
	errs := make([]error, len(receivers))
	wg := sync.WaitGroup{}

	for i, x := range receivers {
		wg.Add(1)

		go func(idx int, recv cardanowallet.TxOutput) {
			defer wg.Done()

			var expectedAmount uint64

			errs[idx] = cardanowallet.ExecuteWithRetry(ctx, retriesMaxCount, retryWait, func() (bool, error) {
				utxos, err := bts.TxUtxoRetrieverDst.GetUtxos(ctx, recv.Addr)
				expectedAmount = cardanowallet.GetUtxosSum(utxos)

				return err == nil, err
			}, isRecoverableError)

			if errs[idx] != nil {
				return
			}

			expectedAmount += recv.Amount

			errs[idx] = cardanowallet.WaitForAmount(
				ctx, bts.TxUtxoRetrieverDst, recv.Addr, func(newAmount uint64) bool {
					return newAmount >= expectedAmount
				},
				retriesTxHashInUtxosCount, retriesTxHashInUtxosWait, isRecoverableError)
		}(i, x)
	}

	wg.Wait()

	return errors.Join(errs...)
}

func (bts *BridgingTxSender) createMetadata(
	chain, senderAddr string, receivers []cardanowallet.TxOutput, feeAmount uint64,
) ([]byte, error) {
	metadataObj := common.BridgingRequestMetadata{
		BridgingTxType:     common.BridgingTxTypeBridgingRequest,
		DestinationChainID: chain,
		SenderAddr:         common.SplitString(senderAddr, splitStringLength),
		Transactions:       make([]common.BridgingRequestMetadataTransaction, 0, len(receivers)+1),
		FeeAmount:          feeAmount,
	}

	for _, x := range receivers {
		metadataObj.Transactions = append(metadataObj.Transactions, common.BridgingRequestMetadataTransaction{
			Address: common.SplitString(x.Addr, splitStringLength),
			Amount:  x.Amount,
		})
	}

	return common.MarshalMetadata(common.MetadataEncodingTypeJSON, metadataObj)
}

func IsAddressInOutputs(
	receivers []cardanowallet.TxOutput, addr string,
) bool {
	for _, x := range receivers {
		if x.Addr == addr {
			return true
		}
	}

	return false
}

func isRecoverableError(err error) bool {
	return strings.Contains(err.Error(), "status code 500") // retry if error is ogmios "status code 500"
}
