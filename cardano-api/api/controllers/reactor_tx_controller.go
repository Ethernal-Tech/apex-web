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
	goEthCommon "github.com/ethereum/go-ethereum/common"
	"github.com/hashicorp/go-hclog"
)

type ReactorTxControllerImpl struct {
	appConfig      *core.AppConfig
	usedUtxoCacher *utils.UsedUtxoCacher
	logger         hclog.Logger
}

var _ core.APIController = (*ReactorTxControllerImpl)(nil)

func NewReactorTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *ReactorTxControllerImpl {
	return &ReactorTxControllerImpl{
		appConfig:      appConfig,
		usedUtxoCacher: utils.NewUsedUtxoCacher(appConfig.UtxoCacheTimeout),
		logger:         logger,
	}
}

func (*ReactorTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *ReactorTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx, APIKeyAuth: true},
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee, APIKeyAuth: true},
		{Path: "GetBalance", Method: http.MethodGet, Handler: c.getBalance, APIKeyAuth: true},
	}
}

func (c *ReactorTxControllerImpl) getBalance(w http.ResponseWriter, r *http.Request) {
	queryValues := r.URL.Query()
	c.logger.Debug("getBalance request", "query values", queryValues, "url", r.URL)

	srcChainIDArr, exists := queryValues["srcChainId"]
	if !exists || len(srcChainIDArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("srcChainId missing from query"), c.logger)

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

	balances := map[common.TokenName]uint64{
		common.APEXToken: wallet.GetUtxosSum(utxos)[wallet.AdaTokenName],
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBalanceResponse(balances), c.logger)
}

func (c *ReactorTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
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

	fee, _, err := c.calculateTxFee(requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK,
		commonResponse.NewBridgingTxFeeResponse(fee, requestBody.BridgingFee), c.logger)
}

func (c *ReactorTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
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

	txRaw, txHash, err := c.createTx(requestBody)
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
		commonResponse.NewFullBridgingTxResponse(txRaw, txHash, requestBody.BridgingFee, amount, 0), c.logger)
}

func (c *ReactorTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *commonRequest.CreateBridgingTxRequest,
) error {
	cardanoSrcConfig, _ := core.GetChainConfig(c.appConfig, requestBody.SourceChainID)
	if cardanoSrcConfig == nil {
		return fmt.Errorf("origin chain not registered: %v", requestBody.SourceChainID)
	}

	cardanoDestConfig, ethDestConfig := core.GetChainConfig(c.appConfig, requestBody.DestinationChainID)
	if cardanoDestConfig == nil && ethDestConfig == nil {
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

	for _, receiver := range requestBody.Transactions {
		if cardanoDestConfig != nil {
			if receiver.Amount < c.appConfig.BridgingSettings.MinValueToBridge {
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

	// this is just convinient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = c.appConfig.BridgingSettings.MinChainFeeForBridging[requestBody.DestinationChainID]
	}

	receiverAmountSum.Add(receiverAmountSum, new(big.Int).SetUint64(requestBody.BridgingFee))

	minFee, found := c.appConfig.BridgingSettings.MinChainFeeForBridging[requestBody.DestinationChainID]
	if !found {
		return fmt.Errorf("no minimal fee for chain: %s", requestBody.DestinationChainID)
	}

	if requestBody.BridgingFee < minFee {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	if c.appConfig.BridgingSettings.MaxAmountAllowedToBridge != nil &&
		c.appConfig.BridgingSettings.MaxAmountAllowedToBridge.Sign() == 1 &&
		receiverAmountSum.Cmp(c.appConfig.BridgingSettings.MaxAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver amounts + fee greater than maximum allowed: %v, for request: %v",
			c.appConfig.BridgingSettings.MaxAmountAllowedToBridge, requestBody)
	}

	return nil
}

func (c *ReactorTxControllerImpl) createTx(requestBody commonRequest.CreateBridgingTxRequest) (
	string, string, error,
) {
	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody)
	if err != nil {
		return "", "", err
	}

	txRawBytes, txHash, _, err := txSender.CreateBridgingTx(
		context.Background(),
		requestBody.SourceChainID, requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
		sendtx.NewExchangeRate(),
	)
	if err != nil {
		return "", "", fmt.Errorf("failed to build tx: %w", err)
	}

	return hex.EncodeToString(txRawBytes), txHash, nil
}

func (c *ReactorTxControllerImpl) calculateTxFee(requestBody commonRequest.CreateBridgingTxRequest) (
	uint64, *sendtx.BridgingRequestMetadata, error,
) {
	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody)
	if err != nil {
		return 0, nil, err
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

func (c *ReactorTxControllerImpl) getTxSenderAndReceivers(requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxSender, []sendtx.BridgingTxReceiver, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate configuration")
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
			Addr:         tx.Addr,
			Amount:       tx.Amount,
			BridgingType: sendtx.BridgingTypeNormal,
		}
	}

	return txSender, receivers, nil
}
