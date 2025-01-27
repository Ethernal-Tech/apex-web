package controllers

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracom "github.com/Ethernal-Tech/cardano-infrastructure/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
)

type SkylineTxControllerImpl struct {
	appConfig      *core.AppConfig
	usedUtxoCacher *utils.UsedUtxoCacher
	logger         hclog.Logger
}

var _ core.APIController = (*SkylineTxControllerImpl)(nil)

func NewSkylineTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *SkylineTxControllerImpl {
	return &SkylineTxControllerImpl{
		appConfig:      appConfig,
		usedUtxoCacher: utils.NewUsedUtxoCacher(appConfig.UtxoCacheTimeout),
		logger:         logger,
	}
}

func (*SkylineTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *SkylineTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "GetBalance", Method: http.MethodGet, Handler: c.getBalance, APIKeyAuth: true},
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee, APIKeyAuth: true},
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx, APIKeyAuth: true},
	}
}

func (c *SkylineTxControllerImpl) getBalance(w http.ResponseWriter, r *http.Request) {
	queryValues := r.URL.Query()
	c.logger.Debug("getBalance request", "query values", queryValues, "url", r.URL)

	srcChainIDArr, exists := queryValues["srcChainId"]
	if !exists || len(srcChainIDArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("srcChainId missing from query"), c.logger)

		return
	}

	dstChainIDArr, exists := queryValues["dstChainId"]
	if !exists || len(dstChainIDArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("dstChainId missing from query"), c.logger)

		return
	}

	addressArr, exists := queryValues["address"]
	if !exists || len(addressArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("address missing from query"), c.logger)

		return
	}

	srcChainID := srcChainIDArr[0]
	dstChainID := dstChainIDArr[0]
	address := addressArr[0]

	chainConfig, exists := c.appConfig.CardanoChains[srcChainID]
	if !exists {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("srcChainID not registered"), c.logger)

		return
	}

	txProvider, err := chainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("failed to create tx provider. err: %w", err), c.logger)

		return
	}

	utxos, err := infracom.ExecuteWithRetry(context.Background(),
		func(ctx context.Context) ([]wallet.Utxo, error) {
			return txProvider.GetUtxos(context.Background(), address)
		}, infracom.WithRetryCount(10), infracom.WithRetryWaitTime(time.Second))

	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("failed to get utxos. err: %w", err), c.logger)

		return
	}

	balanceMap := wallet.GetUtxosSum(utxos)
	balances := make(map[common.TokenName]uint64)

	for tokenName := range balanceMap {
		for _, dst := range chainConfig.ChainSpecific.Destinations {
			if dst.Chain == dstChainID && dst.SrcTokenName == tokenName {
				balances[dst.SrcTokenEnumName] = balanceMap[tokenName]
			}
		}
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBalanceResponse(balances), c.logger)
}

func (c *SkylineTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
	requestBody, ok := utils.DecodeModel[commonRequest.CreateBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	c.logger.Debug("getBridgingTxFee request", "body", requestBody, "url", r.URL)

	err := c.validateAndFillOutCreateBridgingTxRequest(&requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	fee, bridgingRequestMetadata, err := c.calculateTxFee(requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	_ = fee
	_ = bridgingRequestMetadata

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBridgingTxFeeResponse(fee), c.logger)
}

func (c *SkylineTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
	requestBody, ok := utils.DecodeModel[commonRequest.CreateBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	c.logger.Debug("createBridgingTx request", "body", requestBody, "url", r.URL)

	err := c.validateAndFillOutCreateBridgingTxRequest(&requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	txRaw, txHash, bridgingRequestMetadata, err := c.createTx(requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	currencyOutput, tokenOutput, bridgingFee := getOutputAmounts(bridgingRequestMetadata)

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewFullBridgingTxResponse(txRaw, txHash, bridgingFee, currencyOutput, tokenOutput), c.logger,
	)
}

func (c *SkylineTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *commonRequest.CreateBridgingTxRequest,
) error {
	cardanoSrcConfig, _ := core.GetChainConfig(c.appConfig, requestBody.SourceChainID)
	if cardanoSrcConfig == nil {
		return fmt.Errorf("origin chain not registered: %v", requestBody.SourceChainID)
	}

	cardanoDestConfig, _ := core.GetChainConfig(c.appConfig, requestBody.DestinationChainID)
	if cardanoDestConfig == nil {
		return fmt.Errorf("destination chain not registered: %v", requestBody.DestinationChainID)
	}

	if len(requestBody.Transactions) > c.appConfig.BridgingSettings.MaxReceiversPerBridgingRequest {
		return fmt.Errorf("number of receivers in metadata greater than maximum allowed - no: %v, max: %v, requestBody: %v",
			len(requestBody.Transactions), c.appConfig.BridgingSettings.MaxReceiversPerBridgingRequest, requestBody)
	}

	receiverAmountSum := big.NewInt(0)
	feeSum := uint64(0)
	foundAUtxoValueBelowMinimumValue := false
	foundAnInvalidReceiverAddr := false
	transactions := make([]commonRequest.CreateBridgingTxTransactionRequest, 0, len(requestBody.Transactions))

	srcMinUtxoChainValue, srcFound := c.appConfig.BridgingSettings.MinUtxoChainValue[requestBody.SourceChainID]
	if !srcFound {
		return fmt.Errorf("no MinUtxoChainValue for source chain: %s", requestBody.SourceChainID)
	}

	dstMinUtxoChainValue, dstFound := c.appConfig.BridgingSettings.MinUtxoChainValue[requestBody.DestinationChainID]
	if !dstFound {
		return fmt.Errorf("no MinUtxoChainValue for destination chain: %s", requestBody.DestinationChainID)
	}

	for _, receiver := range requestBody.Transactions {
		if receiver.IsNativeToken && receiver.Amount < dstMinUtxoChainValue {
			foundAUtxoValueBelowMinimumValue = true

			break
		}

		if !receiver.IsNativeToken && receiver.Amount < srcMinUtxoChainValue {
			foundAUtxoValueBelowMinimumValue = true

			break
		}

		if !cardanotx.IsValidOutputAddress(receiver.Addr, cardanoDestConfig.NetworkID) {
			foundAnInvalidReceiverAddr = true

			break
		}

		// if fee address is specified in transactions just add amount to the fee sum
		// otherwise keep this transaction
		if receiver.Addr == cardanoDestConfig.BridgingAddresses.FeeAddress {
			if receiver.IsNativeToken {
				return fmt.Errorf("fee receiver invalid")
			}

			feeSum += receiver.Amount
		} else {
			transactions = append(transactions, receiver)

			if !receiver.IsNativeToken {
				receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(receiver.Amount))
			}
		}
	}

	if foundAUtxoValueBelowMinimumValue {
		return fmt.Errorf("found a utxo value below minimum value in request body receivers: %v", requestBody)
	}

	if foundAnInvalidReceiverAddr {
		return fmt.Errorf("found an invalid receiver addr in request body: %v", requestBody)
	}

	requestBody.BridgingFee += feeSum
	requestBody.Transactions = transactions

	minFee, found := c.appConfig.BridgingSettings.MinChainFeeForBridging[requestBody.DestinationChainID]
	if !found {
		return fmt.Errorf("no minimal fee for chain: %s", requestBody.DestinationChainID)
	}

	// this is just convinient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = minFee
	}

	if requestBody.BridgingFee < minFee {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(requestBody.BridgingFee))

	if c.appConfig.BridgingSettings.MaxAmountAllowedToBridge != nil &&
		c.appConfig.BridgingSettings.MaxAmountAllowedToBridge.Sign() == 1 &&
		receiverAmountSum.Cmp(c.appConfig.BridgingSettings.MaxAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver amounts + fee greater than maximum allowed: %v, for request: %v",
			c.appConfig.BridgingSettings.MaxAmountAllowedToBridge, requestBody)
	}

	return nil
}

func (c *SkylineTxControllerImpl) createTx(requestBody commonRequest.CreateBridgingTxRequest) (
	string, string, *sendtx.BridgingRequestMetadata, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to generate configuration")
	}

	var options []sendtx.TxSenderOption

	if useUtxoCache(requestBody, c.appConfig) {
		cacheUtxosTransformer := &utils.CacheUtxosTransformer{
			UtxoCacher: c.usedUtxoCacher,
			Addr:       requestBody.SenderAddr,
		}
		options = append(options, sendtx.WithUtxosTransformer(cacheUtxosTransformer))
	}

	txSender := sendtx.NewTxSender(txSenderChainsConfig, options...)

	receivers := make([]sendtx.BridgingTxReceiver, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = sendtx.BridgingTxReceiver{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
		if tx.IsNativeToken {
			receivers[i].BridgingType = sendtx.BridgingTypeNativeTokenOnSource
		} else {
			receivers[i].BridgingType = sendtx.BridgingTypeCurrencyOnSource
		}
	}

	txRawBytes, txHash, metadata, err := txSender.CreateBridgingTx(
		context.Background(),
		requestBody.SourceChainID, requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
		sendtx.NewExchangeRate(),
	)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to build tx: %w", err)
	}

	return hex.EncodeToString(txRawBytes), txHash, metadata, nil
}

func (c *SkylineTxControllerImpl) calculateTxFee(requestBody commonRequest.CreateBridgingTxRequest) (
	uint64, *sendtx.BridgingRequestMetadata, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to generate configuration")
	}

	var options []sendtx.TxSenderOption

	if useUtxoCache(requestBody, c.appConfig) {
		cacheUtxosTransformer := &utils.CacheUtxosTransformer{
			UtxoCacher: c.usedUtxoCacher,
			Addr:       requestBody.SenderAddr,
		}
		options = append(options, sendtx.WithUtxosTransformer(cacheUtxosTransformer))
	}

	txSender := sendtx.NewTxSender(txSenderChainsConfig, options...)

	receivers := make([]sendtx.BridgingTxReceiver, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = sendtx.BridgingTxReceiver{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
		if tx.IsNativeToken {
			receivers[i].BridgingType = sendtx.BridgingTypeNativeTokenOnSource
		} else {
			receivers[i].BridgingType = sendtx.BridgingTypeCurrencyOnSource
		}
	}

	fee, metadata, err := txSender.CalculateBridgingTxFee(
		context.Background(),
		requestBody.SourceChainID, requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
		sendtx.NewExchangeRate(),
	)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to calculate tx fee: %w", err)
	}

	return fee, metadata, nil
}

func getOutputAmounts(metadata *sendtx.BridgingRequestMetadata) (
	outputCurrencyLovelace uint64, outputNativeToken uint64, bridgingFee uint64,
) {
	bridgingFee = metadata.FeeAmount.SrcAmount

	for _, x := range metadata.Transactions {
		if x.IsNativeTokenOnSource() {
			// WADA/WAPEX to ADA/APEX
			outputNativeToken += x.Amount
		} else {
			// ADA/APEX to WADA/WAPEX or reactor
			outputCurrencyLovelace += x.Amount
		}

		if x.Additional != nil {
			bridgingFee += x.Additional.SrcAmount
		}
	}

	return outputCurrencyLovelace, outputNativeToken, bridgingFee
}

func useUtxoCache(
	requestBody commonRequest.CreateBridgingTxRequest, appConfig *core.AppConfig,
) (useCaching bool) {
	shouldUseUsedUtxoCacher := false

	if desiredKey := requestBody.UTXOCacheKey; desiredKey != "" {
		for _, key := range appConfig.APIConfig.UTXOCacheKeys {
			if key == desiredKey {
				shouldUseUsedUtxoCacher = true

				break
			}
		}
	}

	return shouldUseUsedUtxoCacher
}
