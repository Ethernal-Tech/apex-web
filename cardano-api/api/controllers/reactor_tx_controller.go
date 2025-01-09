package controllers

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/model/reactor/request"
	"github.com/Ethernal-Tech/cardano-api/api/model/reactor/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracom "github.com/Ethernal-Tech/cardano-infrastructure/common"
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
		{Path: "SignBridgingTx", Method: http.MethodPost, Handler: c.signBridgingTx, APIKeyAuth: true},
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

	balance := uint64(0)
	for _, utxo := range utxos {
		balance += utxo.Amount
	}

	balances := map[common.TokenName]uint64{
		common.APEXToken: balance,
	}
	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBalanceResponse(balances), c.logger)
}

func (c *ReactorTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
	requestBody, ok := utils.DecodeModel[request.CreateBridgingTxRequest](w, r, c.logger)
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

	bridgingTxSender, outputs, err := c.getBridgingTxSenderAndOutputs(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	skipUtxos, _ := getSkipUtxos(requestBody, c.appConfig, c.usedUtxoCacher)

	minUtxoValue, found := c.appConfig.BridgingSettings.MinUtxoChainValue[requestBody.SourceChainID]
	if !found {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("no minimal UTXO value for chain: %s", requestBody.SourceChainID), c.logger)

		return
	}

	fee, err := bridgingTxSender.GetTxFee(
		context.Background(), requestBody.DestinationChainID,
		requestBody.SenderAddr, outputs, requestBody.BridgingFee,
		skipUtxos, minUtxoValue,
	)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, response.NewBridgingTxFeeResponse(fee), c.logger)
}

func (c *ReactorTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
	requestBody, ok := utils.DecodeModel[request.CreateBridgingTxRequest](w, r, c.logger)
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

	bridgingTxSender, outputs, err := c.getBridgingTxSenderAndOutputs(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	skipUtxos, usingUtxoCacher := getSkipUtxos(requestBody, c.appConfig, c.usedUtxoCacher)

	minUtxoValue, found := c.appConfig.BridgingSettings.MinUtxoChainValue[requestBody.SourceChainID]
	if !found {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("no minimal UTXO value for chain: %s", requestBody.SourceChainID), c.logger)

		return
	}

	txRawBytes, txHash, txInputs, err := bridgingTxSender.CreateTx(
		context.Background(), requestBody.DestinationChainID,
		requestBody.SenderAddr, outputs, requestBody.BridgingFee,
		skipUtxos, minUtxoValue,
	)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	if usingUtxoCacher {
		c.usedUtxoCacher.Add(requestBody.SenderAddr, txInputs) // cache chosen txInputs
	}

	utils.WriteResponse(
		w, r, http.StatusOK,
		response.NewFullBridgingTxResponse(
			txRawBytes, txHash, requestBody.BridgingFee,
			wallet.GetOutputsSum(outputs)[wallet.AdaTokenName]),
		c.logger)
}

func (c *ReactorTxControllerImpl) signBridgingTx(w http.ResponseWriter, r *http.Request) {
	requestBody, ok := utils.DecodeModel[request.SignBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	if requestBody.TxRaw == "" || requestBody.SigningKeyHex == "" || requestBody.TxHash == "" {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, errors.New("invalid input data"), c.logger)

		return
	}

	c.logger.Debug("signBridgingTx request", "body", requestBody, "url", r.URL)

	signedTx, err := c.signTx(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, errors.New("validation error"), c.logger)

		return
	}

	utils.WriteResponse(
		w, r, http.StatusOK,
		response.NewBridgingTxResponse(signedTx, requestBody.TxHash), c.logger)
}

func (c *ReactorTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *request.CreateBridgingTxRequest,
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
	transactions := make([]request.CreateBridgingTxTransactionRequest, 0, len(requestBody.Transactions))

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

func (c *ReactorTxControllerImpl) getBridgingTxSenderAndOutputs(
	requestBody request.CreateBridgingTxRequest,
) (*cardanotx.BridgingTxSender, []wallet.TxOutput, error) {
	sourceChainConfig, exists := c.appConfig.CardanoChains[requestBody.SourceChainID]
	if !exists {
		return nil, nil, fmt.Errorf("chain does not exists: %s", requestBody.SourceChainID)
	}

	txProvider, err := sourceChainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create tx provider: %w", err)
	}

	bridgingAddress := sourceChainConfig.BridgingAddresses.BridgingAddress
	if requestBody.UseFallback {
		bridgingAddress = sourceChainConfig.BridgingAddresses.FallbackAddress
	}

	bridgingTxSender := cardanotx.NewBridgingTxSender(
		wallet.ResolveCardanoCliBinary(sourceChainConfig.NetworkID),
		txProvider, txProvider, uint(sourceChainConfig.NetworkMagic),
		bridgingAddress,
		sourceChainConfig.ChainSpecific.TTLSlotNumberInc,
		sourceChainConfig.ChainSpecific.PotentialFee, c.logger,
	)

	receivers := make([]wallet.TxOutput, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = wallet.TxOutput{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
	}

	return bridgingTxSender, receivers, nil
}

func (c *ReactorTxControllerImpl) signTx(requestBody request.SignBridgingTxRequest) ([]byte, error) {
	signingKeyBytes, err := common.DecodeHex(requestBody.SigningKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode singing key hex: %w", err)
	}

	txRawBytes, err := common.DecodeHex(requestBody.TxRaw)
	if err != nil {
		return nil, fmt.Errorf("failed to decode raw tx: %w", err)
	}

	cardanoCliBinary := wallet.ResolveCardanoCliBinary(wallet.CardanoNetworkType(requestBody.NetworkID))
	senderWallet := wallet.NewWallet(
		wallet.GetVerificationKeyFromSigningKey(signingKeyBytes), signingKeyBytes)

	txBuilder, err := wallet.NewTxBuilder(cardanoCliBinary)
	if err != nil {
		return nil, fmt.Errorf("failed to create tx builder: %w", err)
	}

	defer txBuilder.Dispose()

	signedTxBytes, err := txBuilder.SignTx(txRawBytes, []wallet.ITxSigner{senderWallet})
	if err != nil {
		return nil, fmt.Errorf("failed to sign tx: %w", err)
	}

	return signedTxBytes, nil
}

func getSkipUtxos(
	requestBody request.CreateBridgingTxRequest, appConfig *core.AppConfig, usedUtxoCacher *utils.UsedUtxoCacher,
) (skipUtxos []wallet.TxInput, useCaching bool) {
	shouldUseUsedUtxoCacher := false

	if desiredKey := requestBody.UTXOCacheKey; desiredKey != "" {
		for _, key := range appConfig.APIConfig.UTXOCacheKeys {
			if key == desiredKey {
				shouldUseUsedUtxoCacher = true

				break
			}
		}
	}

	if shouldUseUsedUtxoCacher {
		return usedUtxoCacher.Get(requestBody.SenderAddr), true
	}

	return common.Map(requestBody.SkipUtxos, func(x request.UtxoRequest) wallet.TxInput {
		return wallet.TxInput{
			Hash:  x.Hash,
			Index: x.Index,
		}
	}), false
}
