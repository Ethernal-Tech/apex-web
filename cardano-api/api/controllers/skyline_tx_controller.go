package controllers

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/core"
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
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee},
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx},
	}
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

	txFeeInfo, bridgingRequestMetadata, err := c.calculateTxFee(requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBridgingTxFeeResponse(
		txFeeInfo.Fee, bridgingRequestMetadata.BridgingFee), c.logger)
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

	txInfo, bridgingRequestMetadata, err := c.createTx(requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	currencyOutput, tokenOutput := bridgingRequestMetadata.GetOutputAmounts()
	currencyOutput -= bridgingRequestMetadata.BridgingFee - bridgingRequestMetadata.OperationFee

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewBridgingTxResponse(
			txInfo.TxRaw, txInfo.TxHash, bridgingRequestMetadata.BridgingFee, currencyOutput, tokenOutput), c.logger,
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

	minFee, found := c.appConfig.BridgingSettings.MinChainFeeForBridging[requestBody.SourceChainID]
	if !found {
		return fmt.Errorf("no minimal fee for chain: %s", requestBody.SourceChainID)
	}

	// this is just convinient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = minFee
	}

	receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(requestBody.BridgingFee))

	if requestBody.BridgingFee < minFee {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	operationFee, found := c.appConfig.BridgingSettings.MinOperationFee[requestBody.SourceChainID]
	if !found {
		return fmt.Errorf("no operation fee for chain: %s", requestBody.SourceChainID)
	}

	// this is just convinient way to setup default operation fee
	if requestBody.OperationFee == 0 {
		requestBody.OperationFee = operationFee
	}

	receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(requestBody.OperationFee))

	if requestBody.OperationFee < operationFee {
		return fmt.Errorf("operation fee in request body is less than minimum: %v", requestBody)
	}

	if c.appConfig.BridgingSettings.MaxAmountAllowedToBridge != nil &&
		c.appConfig.BridgingSettings.MaxAmountAllowedToBridge.Sign() == 1 &&
		receiverAmountSum.Cmp(c.appConfig.BridgingSettings.MaxAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver amounts + fee greater than maximum allowed: %v, for request: %v",
			c.appConfig.BridgingSettings.MaxAmountAllowedToBridge, requestBody)
	}

	return nil
}

func (c *SkylineTxControllerImpl) createTx(requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxInfo, *sendtx.BridgingRequestMetadata, error,
) {
	cacheUtxosTransformer := (*utils.CacheUtxosTransformer)(nil)
	if useUtxoCache(requestBody, c.appConfig) {
		cacheUtxosTransformer = &utils.CacheUtxosTransformer{
			UtxoCacher: c.usedUtxoCacher,
			Addr:       requestBody.SenderAddr,
		}
	}

	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody, cacheUtxosTransformer)
	if err != nil {
		return nil, nil, err
	}

	txInfo, metadata, err := txSender.CreateBridgingTx(
		context.Background(),
		requestBody.SourceChainID, requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
		requestBody.OperationFee,
	)
	if err != nil {
		c.logger.Error("failed to build tx", "err", err)

		if errors.Is(err, wallet.ErrUTXOsCouldNotSelect) {
			err = errors.New("not enough funds for the transaction")
		}

		return nil, nil, fmt.Errorf("failed to build tx: %w", err)
	}

	if cacheUtxosTransformer != nil {
		cacheUtxosTransformer.UpdateUtxos(txInfo.ChosenInputs.Inputs)
	}

	return txInfo, metadata, nil
}

func (c *SkylineTxControllerImpl) calculateTxFee(requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxFeeInfo, *sendtx.BridgingRequestMetadata, error,
) {
	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody, nil)
	if err != nil {
		return nil, nil, err
	}

	txFeeInfo, metadata, err := txSender.CalculateBridgingTxFee(
		context.Background(),
		requestBody.SourceChainID, requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
		requestBody.OperationFee,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to calculate tx fee: %w", err)
	}

	return txFeeInfo, metadata, nil
}

func (c *SkylineTxControllerImpl) getTxSenderAndReceivers(
	requestBody commonRequest.CreateBridgingTxRequest,
	cacheUtxosTransformer *utils.CacheUtxosTransformer,
) (
	*sendtx.TxSender, []sendtx.BridgingTxReceiver, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate configuration")
	}

	txSender := sendtx.NewTxSender(txSenderChainsConfig, sendtx.WithUtxosTransformer(cacheUtxosTransformer))

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

	return txSender, receivers, nil
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
