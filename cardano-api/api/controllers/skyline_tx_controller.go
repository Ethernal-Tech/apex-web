// @title Cardano API
// @version 1.0
// @BasePath /api
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name X-API-Key
package controllers

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	utxotransformer "github.com/Ethernal-Tech/cardano-api/api/utxo_transformer"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracommon "github.com/Ethernal-Tech/cardano-infrastructure/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	cache "github.com/dgraph-io/ristretto"
	"github.com/hashicorp/go-hclog"
)

const (
	getLockedTokensCacheKeyName  = "default"
	getLockedTokensCacheDuration = time.Second * 30
)

type SkylineTxControllerImpl struct {
	appConfig            *core.AppConfig
	usedUtxoCacher       *utxotransformer.UsedUtxoCacher
	getLockedTokensCache *cache.Cache
	logger               hclog.Logger
}

var _ core.APIController = (*SkylineTxControllerImpl)(nil)

func NewSkylineTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *SkylineTxControllerImpl {
	getLockedTokensCache, err := cache.NewCache(&cache.Config{
		NumCounters: 1,       // recommended: 10x the number of items you expect to store
		MaxCost:     1 << 20, // max cost in bytes (1MB here)
		BufferItems: 64,
	})
	if err != nil {
		logger.Warn("can't initialise a new cache", "err", err)
	}

	return &SkylineTxControllerImpl{
		appConfig:            appConfig,
		usedUtxoCacher:       utxotransformer.NewUsedUtxoCacher(appConfig.UtxoCacheTimeout),
		getLockedTokensCache: getLockedTokensCache,
		logger:               logger,
	}
}

func (*SkylineTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *SkylineTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee},
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx},
		{Path: "GetSettings", Method: http.MethodGet, Handler: c.getSettings},
		{Path: "GetLockedTokens", Method: http.MethodGet, Handler: c.getLockedAmountOfTokens},
	}
}

// @Summary Get fees required for a bridging transaction
// @Description Returns the transaction and bridging fees that the sender must pay on the source chain. The bridging fee covers the cost for the fee payer to submit the transaction on the destination chain.
// @Tags CardanoTx
// @Accept json
// @Produce json
// @Param data body commonRequest.CreateBridgingTxRequest true "Bridging transaction data"
// @Success 200 {object} commonResponse.BridgingTxFeeResponse "OK - Returns calculated fees."
// @Failure 400 {object} commonResponse.ErrorResponse "Bad Request – Validation error due to input data not meeting required conditions."
// @Failure 401 {object} commonResponse.ErrorResponse "Unauthorized – API key missing or invalid."
// @Failure 500 {object} commonResponse.ErrorResponse "Internal server error"
// @Security ApiKeyAuth
// @Router /CardanoTx/GetBridgingTx [POST]
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

	txFeeInfo, bridgingRequestMetadata, err := c.calculateTxFee(r.Context(), requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBridgingTxFeeResponse(
		txFeeInfo.Fee, bridgingRequestMetadata.BridgingFee), c.logger)
}

// @Summary Create a bridging transaction
// @Description Builds a bridging transaction with all required fees and metadata. The transaction must be signed and submitted separately.
// @Tags CardanoTx
// @Accept json
// @Produce json
// @Param data body commonRequest.CreateBridgingTxRequest true "Bridging transaction data"
// @Success 200 {object} commonResponse.BridgingTxResponse "OK - Returns the raw transaction data, transaction hash, and calculated bridging fee and amounts."
// @Failure 400 {object} commonResponse.ErrorResponse "Bad Request – Validation error due to input data not meeting required conditions."
// @Failure 401 {object} commonResponse.ErrorResponse "Unauthorized – API key missing or invalid."
// @Failure 500 {object} commonResponse.ErrorResponse "Internal server error"
// @Security ApiKeyAuth
// @Router /CardanoTx/CreateBridgingTx [POST]
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

	txInfo, bridgingRequestMetadata, err := c.createTx(r.Context(), requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	currencyOutput, tokenOutput := bridgingRequestMetadata.GetOutputAmounts()
	currencyOutput -= bridgingRequestMetadata.BridgingFee + bridgingRequestMetadata.OperationFee

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewBridgingTxResponse(
			txInfo.TxRaw, txInfo.TxHash, bridgingRequestMetadata.BridgingFee, currencyOutput, tokenOutput), c.logger,
	)
}

// @Summary Get bridge settings
// @Description Returns the participating chains with their specific settings, global bridge configuration (such as minimum and maximum allowed bridging amounts), and, for each source chain, the native token that will be received on the destination chain.
// @Tags CardanoTx
// @Produce json
// @Success 200 {object} commonResponse.SettingsResponse "OK - Returns the configuration settings."
// @Failure 401 {object} commonResponse.ErrorResponse "Unauthorized – API key missing or invalid."
// @Security ApiKeyAuth
// @Router /CardanoTx/GetSettings [get]
func (c *SkylineTxControllerImpl) getSettings(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getSettings request", "url", r.URL)

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewSettingsResponse(c.appConfig), c.logger)
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
	receiverWrappedTokenAmountSum := big.NewInt(0)
	feeSum := uint64(0)
	foundAUtxoValueBelowMinimumValue := false
	foundAnInvalidReceiverAddr := false
	hasNativeTokenOnSource := false
	hasCurrencyOnSource := false
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
		if receiver.IsNativeToken {
			hasNativeTokenOnSource = true

			if receiver.Amount < dstMinUtxoChainValue {
				foundAUtxoValueBelowMinimumValue = true

				break
			}
		}

		if !receiver.IsNativeToken {
			hasCurrencyOnSource = true

			if receiver.Amount < srcMinUtxoChainValue {
				foundAUtxoValueBelowMinimumValue = true

				break
			}
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
			} else {
				receiverWrappedTokenAmountSum.Add(receiverWrappedTokenAmountSum, new(big.Int).SetUint64(receiver.Amount))
			}
		}
	}

	if foundAUtxoValueBelowMinimumValue {
		return fmt.Errorf("found a utxo value below minimum value in request body receivers: %v", requestBody)
	}

	if foundAnInvalidReceiverAddr {
		return fmt.Errorf("found an invalid receiver addr in request body: %v", requestBody)
	}

	if hasNativeTokenOnSource {
		_, err := cardanoSrcConfig.ChainSpecific.GetNativeToken(requestBody.DestinationChainID)
		if err != nil {
			return err
		}
	}

	if hasCurrencyOnSource {
		if _, err := cardanoDestConfig.ChainSpecific.GetNativeToken(requestBody.SourceChainID); err != nil {
			return err
		}
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

	if c.appConfig.BridgingSettings.MaxAmountAllowedToBridge != nil &&
		c.appConfig.BridgingSettings.MaxAmountAllowedToBridge.Sign() == 1 &&
		receiverAmountSum.Cmp(c.appConfig.BridgingSettings.MaxAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver amounts + fee greater than maximum allowed: %v, for request: %v",
			c.appConfig.BridgingSettings.MaxAmountAllowedToBridge, requestBody)
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

	if c.appConfig.BridgingSettings.MaxTokenAmountAllowedToBridge != nil &&
		c.appConfig.BridgingSettings.MaxTokenAmountAllowedToBridge.Sign() == 1 &&
		receiverWrappedTokenAmountSum.Cmp(c.appConfig.BridgingSettings.MaxTokenAmountAllowedToBridge) == 1 {
		return fmt.Errorf("sum of receiver token amounts greater than maximum allowed: %v, for request: %v",
			c.appConfig.BridgingSettings.MaxTokenAmountAllowedToBridge, requestBody)
	}

	return nil
}

func (c *SkylineTxControllerImpl) createTx(ctx context.Context, requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxInfo, *sendtx.BridgingRequestMetadata, error,
) {
	cacheUtxosTransformer := utils.GetUtxosTransformer(requestBody, c.appConfig, c.usedUtxoCacher)

	bridgingAddress, err := utils.GetAddressToBridgeTo(
		ctx,
		c.appConfig.OracleAPI.URL,
		c.appConfig.OracleAPI.APIKey,
		requestBody.SourceChainID,
		utils.ContainsNativeTokens(requestBody),
	)
	if err != nil {
		return nil, nil, err
	}

	txSender, receivers, err := c.getTxSenderAndReceivers(requestBody, cacheUtxosTransformer)
	if err != nil {
		return nil, nil, err
	}

	txInfo, metadata, err := txSender.CreateBridgingTx(
		ctx,
		sendtx.BridgingTxDto{
			SrcChainID:             requestBody.SourceChainID,
			DstChainID:             requestBody.DestinationChainID,
			SenderAddr:             requestBody.SenderAddr,
			SenderAddrPolicyScript: requestBody.SenderAddrPolicyScript,
			Receivers:              receivers,
			BridgingAddress:        bridgingAddress.Address,
			BridgingFee:            requestBody.BridgingFee,
			OperationFee:           0,
		},
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

func (c *SkylineTxControllerImpl) calculateTxFee(
	ctx context.Context,
	requestBody commonRequest.CreateBridgingTxRequest) (
	*sendtx.TxFeeInfo,
	*sendtx.BridgingRequestMetadata,
	error,
) {
	// Get bridging address
	bridgingAddress, err := utils.GetAddressToBridgeTo(
		ctx,
		c.appConfig.OracleAPI.URL,
		c.appConfig.OracleAPI.APIKey,
		requestBody.SourceChainID,
		utils.ContainsNativeTokens(requestBody),
	)
	if err != nil {
		return nil, nil, err
	}

	// Setup transaction components
	txSender, receivers, err := c.getTxSenderAndReceivers(
		requestBody, utils.GetUtxosTransformer(requestBody, c.appConfig, c.usedUtxoCacher))
	if err != nil {
		return nil, nil, err
	}

	// Calculate transaction fee
	txFeeInfo, metadata, err := txSender.CalculateBridgingTxFee(
		ctx,
		sendtx.BridgingTxDto{
			SrcChainID:             requestBody.SourceChainID,
			DstChainID:             requestBody.DestinationChainID,
			SenderAddr:             requestBody.SenderAddr,
			SenderAddrPolicyScript: requestBody.SenderAddrPolicyScript,
			Receivers:              receivers,
			BridgingAddress:        bridgingAddress.Address,
			BridgingFee:            requestBody.BridgingFee,
			OperationFee:           0,
		},
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to calculate tx fee: %w", err)
	}

	return txFeeInfo, metadata, nil
}

func (c *SkylineTxControllerImpl) getTxSenderAndReceivers(
	requestBody commonRequest.CreateBridgingTxRequest,
	utxosTransformer sendtx.IUtxosTransformer,
) (
	*sendtx.TxSender, []sendtx.BridgingTxReceiver, error,
) {
	txSenderChainsConfig, err := c.appConfig.ToSendTxChainConfigs(requestBody.UseFallback)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate configuration")
	}

	txSender := sendtx.NewTxSender(txSenderChainsConfig, sendtx.WithUtxosTransformer(utxosTransformer))

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

func (c *SkylineTxControllerImpl) getLockedAmountOfTokens(
	w http.ResponseWriter,
	r *http.Request,
) {
	c.logger.Debug("get amount of locked tokens", "url", r.URL)

	// Check cache first
	if c.getLockedTokensCache != nil {
		cachedResponse, found := c.getLockedTokensCache.Get(getLockedTokensCacheKeyName)
		if found {
			c.logger.Debug("getBalance request returned cached response")

			utils.WriteResponse(w, r, http.StatusOK, cachedResponse, c.logger)

			return
		}
	}

	calculateLockedTokens := func(cfg *core.CardanoChainConfig) (map[string]map[string]string, error) {
		// Get all bridging addresses
		bridgingAddresses, err := utils.GetAllBridgingAddress(
			r.Context(),
			c.appConfig.OracleAPI.URL,
			c.appConfig.OracleAPI.APIKey,
			cfg.ChainID,
		)
		if err != nil {
			return nil, err
		}

		txProviderCardano, err := cfg.ChainSpecific.CreateTxProvider()
		if err != nil {
			return nil, fmt.Errorf("failed to create tx provider. err: %w", err)
		}

		tokenNames := map[string]bool{}
		for _, nt := range cfg.ChainSpecific.NativeTokens {
			token, err := wallet.NewTokenWithFullNameTry(nt.TokenName)
			if err != nil {
				continue
			}

			tokenNames[token.String()] = true
		}

		// First accumulate per-address → token → big.Int
		perAddr := map[string]map[string]*big.Int{}

		ensure := func(addr, token string) {
			if _, ok := perAddr[addr]; !ok {
				perAddr[addr] = map[string]*big.Int{}
			}

			if _, ok := perAddr[addr][token]; !ok {
				perAddr[addr][token] = big.NewInt(0)
			}
		}

		for _, addr := range bridgingAddresses.Addresses {
			utxos, err := infracommon.ExecuteWithRetry(r.Context(), func(ctx context.Context) ([]wallet.Utxo, error) {
				return txProviderCardano.GetUtxos(ctx, addr)
			})
			if err != nil {
				return nil, fmt.Errorf("failed to get utxos from chain. err: %w", err)
			}

			for _, utxo := range utxos {
				// ADA
				ensure(addr, wallet.AdaTokenName)
				perAddr[addr][wallet.AdaTokenName].Add(
					perAddr[addr][wallet.AdaTokenName],
					new(big.Int).SetUint64(utxo.Amount),
				)

				// Native tokens
				for _, tkn := range utxo.Tokens {
					name := tkn.TokenName()
					if !tokenNames[name] {
						continue
					}

					ensure(addr, name)

					perAddr[addr][name].Add(perAddr[addr][name], new(big.Int).SetUint64(tkn.Amount))
				}
			}
		}

		// Transpose to token → address → string
		out := map[string]map[string]string{}

		for addr, tokens := range perAddr {
			for token, amt := range tokens {
				if _, ok := out[token]; !ok {
					out[token] = map[string]string{}
				}

				out[token][addr] = amt.String()
			}
		}

		return out, nil
	}

	// Calculate locked tokens for all chains
	response := commonResponse.NewLockedTokensResponse(map[string]map[string]map[string]string{})

	for chainID, chainCfg := range c.appConfig.CardanoChains {
		subResponse, err := calculateLockedTokens(chainCfg)
		if err != nil {
			utils.WriteErrorResponse(w, r, http.StatusBadRequest, err, c.logger)

			return
		}

		response.Chains[chainID] = subResponse
	}

	// Cache the response
	if c.getLockedTokensCache != nil {
		c.getLockedTokensCache.SetWithTTL(
			getLockedTokensCacheKeyName,
			response,
			1,
			getLockedTokensCacheDuration)
	}

	utils.WriteResponse(w, r, http.StatusOK, response, c.logger)
}
