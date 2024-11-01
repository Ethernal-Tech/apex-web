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
	"github.com/hashicorp/go-hclog"
)

const (
	splitStringLength = 40

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
	logger             hclog.Logger
}

func NewBridgingTxSender(
	cardanoCliBinary string,
	txProvider cardanowallet.ITxProvider,
	txUtxoRetriever cardanowallet.IUTxORetriever,
	testNetMagic uint,
	multiSigAddr string,
	ttlSlotNumberInc uint64,
	potentialFee uint64,
	logger hclog.Logger,
) *BridgingTxSender {
	return &BridgingTxSender{
		cardanoCliBinary:   cardanoCliBinary,
		TxProviderSrc:      txProvider,
		TxUtxoRetrieverDst: txUtxoRetriever,
		TestNetMagicSrc:    testNetMagic,
		MultiSigAddrSrc:    multiSigAddr,
		PotentialFee:       potentialFee,
		TTLSlotNumberInc:   ttlSlotNumberInc,
		logger:             logger,
	}
}

// CreateTx creates tx and returns cbor of raw transaction data, tx hash and error
func (bts *BridgingTxSender) CreateTx(
	ctx context.Context,
	chain string,
	senderAddr string,
	receivers []cardanowallet.TxOutput,
	feeAmount uint64,
	skipUtxos []cardanowallet.TxInput,
) ([]byte, string, []cardanowallet.TxInput, error) {
	outputsSum, inputs, builder, err := bts.getTxBuilderData(
		ctx, chain, senderAddr, receivers, feeAmount, skipUtxos)
	if err != nil {
		return nil, "", nil, err
	}

	defer builder.Dispose()

	fee, err := builder.CalculateFee(0)
	if err != nil {
		return nil, "", nil, err
	}

	change := inputs.Sum - outputsSum - fee
	// handle overflow or insufficient amount
	if change > inputs.Sum || (change > 0 && change < cardanowallet.MinUTxODefaultValue) {
		return nil, "", nil, fmt.Errorf("insufficient amount %d for %d or min utxo not satisfied",
			inputs.Sum, outputsSum+fee)
	}

	if change == 0 {
		builder.RemoveOutput(-1)
	} else {
		builder.UpdateOutputAmount(-1, change)
	}

	builder.SetFee(fee)

	tx, hash, err := builder.Build()
	if err != nil {
		return nil, "", nil, err
	}

	return tx, hash, inputs.Inputs, nil
}

func (bts *BridgingTxSender) GetTxFee(
	ctx context.Context,
	chain string,
	senderAddr string,
	receivers []cardanowallet.TxOutput,
	feeAmount uint64,
	skipUtxos []cardanowallet.TxInput,
) (uint64, error) {
	_, _, builder, err := bts.getTxBuilderData(
		ctx, chain, senderAddr, receivers, feeAmount, skipUtxos)
	if err != nil {
		return 0, err
	}

	defer builder.Dispose()

	return builder.CalculateFee(0)
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
	}, common.OgmiosIsRecoverableError)
}

func (bts *BridgingTxSender) WaitForTx(
	ctx context.Context, receivers []cardanowallet.TxOutput,
) error {
	return WaitForTx(ctx, bts.TxUtxoRetrieverDst, receivers)
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
		addr := strings.TrimPrefix(x.Addr, "0x")
		metadataObj.Transactions = append(metadataObj.Transactions, common.BridgingRequestMetadataTransaction{
			Address: common.SplitString(addr, splitStringLength),
			Amount:  x.Amount,
		})
	}

	return common.MarshalMetadata(common.MetadataEncodingTypeJSON, metadataObj)
}

func (bts *BridgingTxSender) getUTXOsForAmount(
	ctx context.Context, retriever cardanowallet.IUTxORetriever, skipUtxos []cardanowallet.TxInput,
	addr string, exactSum uint64, atLeastSum uint64,
) (cardanowallet.TxInputs, error) {
	var (
		allUtxos []cardanowallet.Utxo
		utxos    []cardanowallet.Utxo
		err      error
	)

	err = cardanowallet.ExecuteWithRetry(ctx, 2, 1*time.Second,
		func() (bool, error) {
			allUtxos, err = retriever.GetUtxos(ctx, addr)

			return err == nil, err
		}, common.OgmiosIsRecoverableError)

	if err != nil {
		return cardanowallet.TxInputs{}, err
	}

	if len(skipUtxos) > 0 {
		skipUtxosMap := make(map[string]bool, len(skipUtxos))
		for _, utxo := range skipUtxos {
			skipUtxosMap[fmt.Sprintf("%s_%d", utxo.Hash, utxo.Index)] = true
		}

		bts.logger.Debug("getUTXOsForAmount", "allUtxos", allUtxos)
		bts.logger.Debug("getUTXOsForAmount", "skipUtxos", skipUtxos)

		count := 0

		for _, utxo := range allUtxos {
			_, skip := skipUtxosMap[fmt.Sprintf("%s_%d", utxo.Hash, utxo.Index)]
			if !skip {
				allUtxos[count] = utxo
				count++
			}
		}

		utxos = allUtxos[:count] // new slice contains only unskipped utxos

		bts.logger.Debug("getUTXOsForAmount", "utxos", utxos)
	} else {
		utxos = allUtxos
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

		if amountSum == exactSum || amountSum >= atLeastSum {
			return cardanowallet.TxInputs{
				Inputs: chosenUTXOs,
				Sum:    amountSum,
			}, nil
		}
	}

	bts.logger.Error("not enough funds for the transaction",
		"available", amountSum, "exact", exactSum, "at least", atLeastSum)

	err = fmt.Errorf("not enough funds for the transaction: available = %d", amountSum)
	if len(allUtxos) != len(utxos) {
		err = errors.New("currently unable to create a transaction. try again later")
	}

	return cardanowallet.TxInputs{}, err
}

func (bts *BridgingTxSender) getTxBuilderData(
	ctx context.Context, chain string, senderAddr string,
	receivers []cardanowallet.TxOutput, feeAmount uint64, skipUtxos []cardanowallet.TxInput,
) (uint64, cardanowallet.TxInputs, *cardanowallet.TxBuilder, error) {
	qtd, protocolParams, err := bts.getTipAndProtocolParameters(ctx)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	metadata, err := bts.createMetadata(chain, senderAddr, receivers, feeAmount)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
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

	desiredSum := outputsSum + bts.PotentialFee + cardanowallet.MinUTxODefaultValue

	inputs, err := bts.getUTXOsForAmount(
		ctx, bts.TxProviderSrc, skipUtxos, senderAddr, desiredSum, desiredSum)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	builder, err := cardanowallet.NewTxBuilder(bts.cardanoCliBinary)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	builder.SetMetaData(metadata).
		SetProtocolParameters(protocolParams).
		SetTimeToLive(qtd.Slot + bts.TTLSlotNumberInc).
		SetTestNetMagic(bts.TestNetMagicSrc).
		AddInputs(inputs.Inputs...).
		AddOutputs(outputs...)

	return outputsSum, inputs, builder, nil
}

func (bts *BridgingTxSender) getTipAndProtocolParameters(
	ctx context.Context,
) (qtd cardanowallet.QueryTipData, protocolParams []byte, err error) {
	err = cardanowallet.ExecuteWithRetry(ctx, 10, 1*time.Second,
		func() (bool, error) {
			qtd, err = bts.TxProviderSrc.GetTip(ctx)

			return err == nil, err
		}, common.OgmiosIsRecoverableError)
	if err != nil {
		return qtd, nil, err
	}

	protocolParams = bts.ProtocolParameters
	if protocolParams == nil {
		err = cardanowallet.ExecuteWithRetry(ctx, 10, 1*time.Second,
			func() (bool, error) {
				protocolParams, err = bts.TxProviderSrc.GetProtocolParameters(ctx)

				return err == nil, err
			}, common.OgmiosIsRecoverableError)
		if err != nil {
			return qtd, nil, err
		}

		bts.ProtocolParameters = protocolParams
	}

	return qtd, protocolParams, nil
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

func WaitForTx(
	ctx context.Context, txUtxoRetriever cardanowallet.IUTxORetriever, receivers []cardanowallet.TxOutput,
) error {
	errs := make([]error, len(receivers))
	wg := sync.WaitGroup{}

	for i, x := range receivers {
		wg.Add(1)

		go func(idx int, recv cardanowallet.TxOutput) {
			defer wg.Done()

			var expectedAmount uint64

			errs[idx] = cardanowallet.ExecuteWithRetry(ctx, retriesMaxCount, retryWait, func() (bool, error) {
				utxos, err := txUtxoRetriever.GetUtxos(ctx, recv.Addr)
				expectedAmount = cardanowallet.GetUtxosSum(utxos)

				return err == nil, err
			}, common.OgmiosIsRecoverableError)

			if errs[idx] != nil {
				return
			}

			expectedAmount += recv.Amount

			errs[idx] = cardanowallet.WaitForAmount(
				ctx, txUtxoRetriever, recv.Addr, func(newAmount uint64) bool {
					return newAmount >= expectedAmount
				},
				retriesTxHashInUtxosCount, retriesTxHashInUtxosWait, common.OgmiosIsRecoverableError)
		}(i, x)
	}

	wg.Wait()

	return errors.Join(errs...)
}
