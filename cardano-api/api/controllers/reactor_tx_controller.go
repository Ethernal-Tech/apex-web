package controllers

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"slices"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	utxotransformer "github.com/Ethernal-Tech/cardano-api/api/utxo_transformer"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	goEthCommon "github.com/ethereum/go-ethereum/common"
	"github.com/hashicorp/go-hclog"
)

type ReactorTxControllerImpl struct {
	appConfig              *core.AppConfig
	usedUtxoCacher         *utxotransformer.UsedUtxoCacher
	logger                 hclog.Logger
	validatorChangeTracker core.ValidatorChangeTracker
}

var _ core.APIController = (*ReactorTxControllerImpl)(nil)

func NewReactorTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
	validatorChange core.ValidatorChangeTracker,
) *ReactorTxControllerImpl {
	return &ReactorTxControllerImpl{
		appConfig:              appConfig,
		usedUtxoCacher:         utxotransformer.NewUsedUtxoCacher(appConfig.UtxoCacheTimeout),
		logger:                 logger,
		validatorChangeTracker: validatorChange,
	}
}

func (*ReactorTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *ReactorTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx},
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee},
		{Path: "GetSettings", Method: http.MethodGet, Handler: c.getSettings},
	}
}

func (c *ReactorTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
	if c.validatorChangeTracker.IsValidatorChangeInProgress() {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf(
				"validator change is in progress, getting the bridging tx fee is not possible at the moment"),
			c.logger)

		return
	}

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

	txFeeInfo, _, err := c.calculateTxFee(r.Context(), requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK,
		commonResponse.NewBridgingTxFeeResponse(txFeeInfo.Fee, requestBody.BridgingFee, 0), c.logger)
}

func (c *ReactorTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
	if c.validatorChangeTracker.IsValidatorChangeInProgress() {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validator change is in progress, creating a bridge tx is not possible at the moment"), c.logger)

		return
	}

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

	txInfo, err := c.createTx(r.Context(), requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	var amount uint64
	for _, transaction := range requestBody.Transactions {
		amount += transaction.Amount
	}

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewBridgingTxResponse(txInfo.TxRaw, txInfo.TxHash, requestBody.BridgingFee, 0, amount, nil), c.logger)
}

func (c *ReactorTxControllerImpl) getSettings(w http.ResponseWriter, r *http.Request) {
	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewReactorSettingsResponse(c.appConfig), c.logger)
}

func (c *ReactorTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *commonRequest.CreateBridgingTxRequest,
) error {
	cardanoSrcConfig, _ := c.appConfig.GetChainConfig(requestBody.SourceChainID)
	if cardanoSrcConfig == nil {
		return fmt.Errorf("origin chain not registered: %v", requestBody.SourceChainID)
	}

	cardanoDestConfig, ethDestConfig := c.appConfig.GetChainConfig(requestBody.DestinationChainID)
	if cardanoDestConfig == nil && ethDestConfig == nil {
		return fmt.Errorf("destination chain not registered: %v", requestBody.DestinationChainID)
	}

	allowedDestinations, ok := c.appConfig.ReactorBridgingSettings.AllowedDirections[requestBody.SourceChainID]
	if !ok || slices.Contains(allowedDestinations, requestBody.DestinationChainID) {
		return fmt.Errorf("direction: %s -> %s not supported", requestBody.SourceChainID, requestBody.DestinationChainID)
	}

	if len(requestBody.Transactions) > c.appConfig.ReactorBridgingSettings.MaxReceiversPerBridgingRequest {
		return fmt.Errorf("number of receivers in metadata greater than maximum allowed - no: %v, max: %v, requestBody: %v",
			len(requestBody.Transactions), c.appConfig.ReactorBridgingSettings.MaxReceiversPerBridgingRequest, requestBody)
	}

	receiverAmountSum := big.NewInt(0)
	feeSum := uint64(0)
	foundAUtxoValueBelowMinimumValue := false
	foundAnInvalidReceiverAddr := false
	transactions := make([]commonRequest.CreateBridgingTxTransactionRequest, 0, len(requestBody.Transactions))

	for _, receiver := range requestBody.Transactions {
		if cardanoDestConfig != nil {
			if receiver.Amount < c.appConfig.ReactorBridgingSettings.MinValueToBridge {
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
				feeSum += receiver.Amount
			} else {
				transactions = append(transactions, receiver)
				receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(receiver.Amount))
			}
		} else if ethDestConfig != nil {
			if !goEthCommon.IsHexAddress(receiver.Addr) {
				foundAnInvalidReceiverAddr = true

				break
			}

			if receiver.Addr == common.EthZeroAddr {
				feeSum += receiver.Amount
			} else {
				transactions = append(transactions, receiver)
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

	minFee, found := c.appConfig.ReactorBridgingSettings.MinChainFeeForBridging[requestBody.SourceChainID]
	if !found {
		return fmt.Errorf("no minimal fee for chain: %s", requestBody.SourceChainID)
	}

	// this is just convinient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = minFee
	}

	if c.appConfig.ReactorBridgingSettings.MaxAmountAllowedToBridge != nil &&
		c.appConfig.ReactorBridgingSettings.MaxAmountAllowedToBridge.Sign() == 1 &&
		receiverAmountSum.Cmp(c.appConfig.ReactorBridgingSettings.MaxAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver amounts + fee greater than maximum allowed: %v, for request: %v",
			c.appConfig.ReactorBridgingSettings.MaxAmountAllowedToBridge, requestBody)
	}

	receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(requestBody.BridgingFee))

	if requestBody.BridgingFee < minFee {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	return nil
}

func (c *ReactorTxControllerImpl) createTx(ctx context.Context, requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxInfo, error,
) {
	// Setup transaction components
	cacheUtxosTransformer := utils.GetUtxosTransformer(requestBody, c.appConfig, c.usedUtxoCacher)

	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody, cacheUtxosTransformer)
	if err != nil {
		return nil, err
	}

	// Create the bridging transaction
	txInfo, _, err := txSender.CreateBridgingTx(
		ctx,
		sendtx.BridgingTxDto{
			SrcChainID:             requestBody.SourceChainID,
			DstChainID:             requestBody.DestinationChainID,
			SenderAddr:             requestBody.SenderAddr,
			SenderAddrPolicyScript: requestBody.SenderAddrPolicyScript,
			Receivers:              receivers,
			BridgingFee:            requestBody.BridgingFee,
			OperationFee:           0,
		},
	)
	if err != nil {
		c.logger.Error("failed to build tx", "err", err)

		if errors.Is(err, wallet.ErrUTXOsCouldNotSelect) {
			err = errors.New("not enough funds for the transaction")
		}

		return nil, fmt.Errorf("failed to build tx: %w", err)
	}

	// Update UTXO cache if available
	if cacheUtxosTransformer != nil {
		cacheUtxosTransformer.UpdateUtxos(txInfo.ChosenInputs.Inputs)
	}

	return txInfo, nil
}

func (c *ReactorTxControllerImpl) calculateTxFee(
	ctx context.Context, requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxFeeInfo, *sendtx.BridgingRequestMetadata, error,
) {
	txSender, receivers, err := c.getTxSenderAndReceivers(
		requestBody, utils.GetUtxosTransformer(requestBody, c.appConfig, c.usedUtxoCacher))
	if err != nil {
		return nil, nil, err
	}

	txFeeInfo, metadata, err := txSender.CalculateBridgingTxFee(
		ctx,
		sendtx.BridgingTxDto{
			SrcChainID:             requestBody.SourceChainID,
			DstChainID:             requestBody.DestinationChainID,
			SenderAddr:             requestBody.SenderAddr,
			SenderAddrPolicyScript: requestBody.SenderAddrPolicyScript,
			Receivers:              receivers,
			BridgingFee:            requestBody.BridgingFee,
			OperationFee:           0,
		},
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to calculate tx fee: %w", err)
	}

	return txFeeInfo, metadata, nil
}

func (c *ReactorTxControllerImpl) getTxSenderAndReceivers(
	requestBody commonRequest.CreateBridgingTxRequest,
	utxosTransformer sendtx.IUtxosTransformer,
) (
	*sendtx.TxSender, []sendtx.BridgingTxReceiver, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate configuration")
	}

	txSender := sendtx.NewTxSender(
		txSenderChainsConfig,
		sendtx.WithUtxosTransformer(utxosTransformer),
		sendtx.WithMinAmountToBridge(c.appConfig.ReactorBridgingSettings.MinValueToBridge),
	)

	receivers := make([]sendtx.BridgingTxReceiver, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = sendtx.BridgingTxReceiver{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
	}

	return txSender, receivers, nil
}
