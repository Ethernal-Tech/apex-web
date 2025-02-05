package cardanotx

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/Ethernal-Tech/cardano-api/common"
	infracom "github.com/Ethernal-Tech/cardano-infrastructure/common"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
)

const (
	splitStringLength = 40
	maxInputs         = 40

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
	feeBridgeAmount uint64,
	skipUtxos []cardanowallet.TxInput,
	minUtxoValue uint64,
) ([]byte, string, []cardanowallet.TxInput, error) {
	outputsSum, inputs, builder, err := bts.getTxBuilderData(
		ctx, chain, senderAddr, receivers, feeBridgeAmount, skipUtxos, minUtxoValue)
	if err != nil {
		return nil, "", nil, err
	}

	defer builder.Dispose()

	fee, err := builder.CalculateFee(1)
	if err != nil {
		return nil, "", nil, err
	}

	// add bridging fee and calculated tx fee to lovelace output in order to calculate good change tx output
	outputsSum[cardanowallet.AdaTokenName] += fee + feeBridgeAmount

	changeTxOutput, err := cardanowallet.CreateTxOutputChange(cardanowallet.TxOutput{
		Addr: senderAddr,
	}, inputs.Sum, outputsSum)
	if err != nil {
		return nil, "", nil, err
	}

	if changeTxOutput.Amount > 0 || len(changeTxOutput.Tokens) > 0 {
		builder.ReplaceOutput(-1, changeTxOutput)
	} else {
		builder.RemoveOutput(-1)
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

func (bts *BridgingTxSender) getTxBuilderData(
	ctx context.Context, chain string, senderAddr string,
	receivers []cardanowallet.TxOutput, feeBridgeAmount uint64,
	skipUtxos []cardanowallet.TxInput, minUtxoValue uint64,
) (map[string]uint64, cardanowallet.TxInputs, *cardanowallet.TxBuilder, error) {
	qtd, protocolParams, err := bts.getTipAndProtocolParameters(ctx)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, err
	}

	allUtxos, err := infracom.ExecuteWithRetry(ctx, func(ctx context.Context) ([]cardanowallet.Utxo, error) {
		return bts.TxProviderSrc.GetUtxos(ctx, senderAddr)
	})
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, err
	}

	allUtxos = bts.filterOutSkippedUtxos(allUtxos, skipUtxos)

	// utxos without tokens should come first
	sort.Slice(allUtxos, func(i, j int) bool {
		return len(allUtxos[i].Tokens) < len(allUtxos[j].Tokens)
	})

	metadata, err := bts.createMetadata(chain, senderAddr, receivers, feeBridgeAmount)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, err
	}

	builder, err := cardanowallet.NewTxBuilder(bts.cardanoCliBinary)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, err
	}

	builder.SetMetaData(metadata).
		SetProtocolParameters(protocolParams).
		SetTimeToLive(qtd.Slot + bts.TTLSlotNumberInc).
		SetTestNetMagic(bts.TestNetMagicSrc)

	potentialTokenCost, err := cardanowallet.GetTokenCostSum(builder, senderAddr, allUtxos)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, fmt.Errorf("failed to retrieve token cost sum. err: %w", err)
	}

	minUtxoValue = max(minUtxoValue, potentialTokenCost)

	outputsSum := cardanowallet.GetOutputsSum(receivers)
	outputsSumLovelace := outputsSum[cardanowallet.AdaTokenName] + feeBridgeAmount
	desiredSumLovelace := outputsSumLovelace + bts.PotentialFee + minUtxoValue

	inputs, err := cardanowallet.GetUTXOsForAmount(
		allUtxos, cardanowallet.AdaTokenName, desiredSumLovelace, maxInputs)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil, err
	}

	tokens, err := cardanowallet.GetTokensFromSumMap(inputs.Sum)
	if err != nil {
		return nil, cardanowallet.TxInputs{}, nil,
			fmt.Errorf("failed to create tokens from sum map. err: %w", err)
	}

	builder.AddInputs(inputs.Inputs...).AddOutputs(cardanowallet.TxOutput{
		Addr:   bts.MultiSigAddrSrc,
		Amount: outputsSumLovelace,
	}, cardanowallet.TxOutput{
		Addr:   senderAddr,
		Tokens: tokens,
	})

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

func (bts *BridgingTxSender) filterOutSkippedUtxos(
	allUtxos []cardanowallet.Utxo, skipUtxos []cardanowallet.TxInput,
) []cardanowallet.Utxo {
	if len(skipUtxos) == 0 {
		return allUtxos
	}

	var utxos []cardanowallet.Utxo

	skipUtxosMap := make(map[string]bool, len(skipUtxos))
	for _, utxo := range skipUtxos {
		skipUtxosMap[fmt.Sprintf("%s_%d", utxo.Hash, utxo.Index)] = true
	}

	count := 0

	for _, utxo := range allUtxos {
		_, skip := skipUtxosMap[fmt.Sprintf("%s_%d", utxo.Hash, utxo.Index)]
		if !skip {
			allUtxos[count] = utxo
			count++
		}
	}

	utxos = allUtxos[:count] // new slice contains only unskipped utxos

	bts.logger.Debug("filterOutSkippedUtxos",
		"allUtxos", allUtxos,
		"skipUtxos", skipUtxos,
		"utxos", utxos,
	)

	return utxos
}
