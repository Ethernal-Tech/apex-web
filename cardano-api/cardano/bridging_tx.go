package cardanotx

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Ethernal-Tech/cardano-api/common"
	infracom "github.com/Ethernal-Tech/cardano-infrastructure/common"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
)

const (
	splitStringLength = 40

	retryWait       = time.Millisecond * 1000
	retriesMaxCount = 10
)

type BridgingTxSender struct {
	cardanoCliBinary   string
	TxProviderSrc      cardanowallet.ITxProvider
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
	testNetMagic uint,
	multiSigAddr string,
	ttlSlotNumberInc uint64,
	potentialFee uint64,
	logger hclog.Logger,
) *BridgingTxSender {
	return &BridgingTxSender{
		cardanoCliBinary: cardanoCliBinary,
		TxProviderSrc:    txProvider,
		TestNetMagicSrc:  testNetMagic,
		MultiSigAddrSrc:  multiSigAddr,
		PotentialFee:     potentialFee,
		TTLSlotNumberInc: ttlSlotNumberInc,
		logger:           logger,
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
	minUtxoValue uint64,
) ([]byte, string, []cardanowallet.TxInput, error) {
	outputsSum, inputs, builder, err := bts.getTxBuilderData(
		ctx, chain, senderAddr, receivers, feeAmount, skipUtxos, minUtxoValue)
	if err != nil {
		return nil, "", nil, err
	}

	defer builder.Dispose()

	fee, err := builder.CalculateFee(1)
	if err != nil {
		return nil, "", nil, err
	}

	inputsAdaSum := inputs.Sum[cardanowallet.AdaTokenName]
	change := inputsAdaSum - outputsSum - fee
	// handle overflow or insufficient amount
	if change > inputsAdaSum || change < minUtxoValue {
		return nil, "", nil, fmt.Errorf("insufficient amount %d for %d or min utxo not satisfied",
			inputsAdaSum, outputsSum+fee)
	}

	builder.UpdateOutputAmount(-1, change)

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
	minUtxoValue uint64,
) (uint64, error) {
	_, _, builder, err := bts.getTxBuilderData(
		ctx, chain, senderAddr, receivers, feeAmount, skipUtxos, minUtxoValue)
	if err != nil {
		return 0, err
	}

	defer builder.Dispose()

	return builder.CalculateFee(1)
}

func (bts *BridgingTxSender) SendTx(
	ctx context.Context, txRaw []byte, txHash string, cardanoWallet cardanowallet.ITxSigner,
) error {
	builder, err := cardanowallet.NewTxBuilder(bts.cardanoCliBinary)
	if err != nil {
		return err
	}

	defer builder.Dispose()

	txSigned, err := builder.SignTx(txRaw, []cardanowallet.ITxSigner{cardanoWallet})
	if err != nil {
		return err
	}

	_, err = infracom.ExecuteWithRetry(ctx,
		func(ctx context.Context) (bool, error) {
			return true, bts.TxProviderSrc.SubmitTx(ctx, txSigned)
		}, infracom.WithRetryCount(retriesMaxCount), infracom.WithRetryWaitTime(retryWait))

	return err
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
	addr string, tokenName string, exactSum uint64, atLeastSum uint64,
) (cardanowallet.TxInputs, error) {
	var (
		allUtxos []cardanowallet.Utxo
		utxos    []cardanowallet.Utxo
		err      error
	)

	allUtxos, err = infracom.ExecuteWithRetry(ctx,
		func(ctx context.Context) ([]cardanowallet.Utxo, error) {
			return retriever.GetUtxos(ctx, addr)
		}, infracom.WithRetryCount(2), infracom.WithRetryWaitTime(time.Second))

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
		currentSum  = map[string]uint64{}
		chosenUTXOs []cardanowallet.TxInput
	)

	for _, utxo := range utxos {
		currentSum[cardanowallet.AdaTokenName] += utxo.Amount

		for _, token := range utxo.Tokens {
			currentSum[token.TokenName()] += token.Amount
		}

		chosenUTXOs = append(chosenUTXOs, cardanowallet.TxInput{
			Hash:  utxo.Hash,
			Index: utxo.Index,
		})

		if currentSum[tokenName] == exactSum || currentSum[tokenName] >= atLeastSum {
			return cardanowallet.TxInputs{
				Inputs: chosenUTXOs,
				Sum:    currentSum,
			}, nil
		}
	}

	bts.logger.Error("not enough funds for the transaction",
		"available", currentSum[tokenName], "exact", exactSum, "at least", atLeastSum)

	err = fmt.Errorf("not enough funds for the transaction: available = %d", currentSum[tokenName])
	if len(allUtxos) != len(utxos) {
		err = errors.New("currently unable to create a transaction. try again later")
	}

	return cardanowallet.TxInputs{}, err
}

func (bts *BridgingTxSender) getTxBuilderData(
	ctx context.Context, chain string, senderAddr string,
	receivers []cardanowallet.TxOutput, feeAmount uint64,
	skipUtxos []cardanowallet.TxInput, minUtxoValue uint64,
) (uint64, cardanowallet.TxInputs, *cardanowallet.TxBuilder, error) {
	qtd, protocolParams, err := bts.getTipAndProtocolParameters(ctx)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	metadata, err := bts.createMetadata(chain, senderAddr, receivers, feeAmount)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	outputsSum := cardanowallet.GetOutputsSum(receivers)[cardanowallet.AdaTokenName] + feeAmount
	desiredSum := outputsSum + bts.PotentialFee + minUtxoValue

	inputs, err := bts.getUTXOsForAmount(
		ctx, bts.TxProviderSrc, skipUtxos, senderAddr, cardanowallet.AdaTokenName, desiredSum, desiredSum)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil, err
	}

	tokens, err := cardanowallet.GetTokensFromSumMap(inputs.Sum)
	if err != nil {
		return 0, cardanowallet.TxInputs{}, nil,
			fmt.Errorf("failed to create tokens from sum map. err: %w", err)
	}

	outputs := []cardanowallet.TxOutput{
		{
			Addr:   bts.MultiSigAddrSrc,
			Amount: outputsSum,
		},
		{
			Addr:   senderAddr,
			Tokens: tokens,
		},
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
	qtd, err = infracom.ExecuteWithRetry(ctx,
		func(ctx context.Context) (cardanowallet.QueryTipData, error) {
			return bts.TxProviderSrc.GetTip(ctx)
		}, infracom.WithRetryCount(10), infracom.WithRetryWaitTime(time.Second))
	if err != nil {
		return qtd, nil, err
	}

	protocolParams = bts.ProtocolParameters
	if protocolParams == nil {
		protocolParams, err = infracom.ExecuteWithRetry(ctx,
			func(ctx context.Context) ([]byte, error) {
				return bts.TxProviderSrc.GetProtocolParameters(ctx)
			}, infracom.WithRetryCount(10), infracom.WithRetryWaitTime(time.Second))
		if err != nil {
			return qtd, nil, err
		}

		bts.ProtocolParameters = protocolParams
	}

	return qtd, protocolParams, nil
}
