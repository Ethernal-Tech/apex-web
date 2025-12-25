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
	"strings"
	"time"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	utxotransformer "github.com/Ethernal-Tech/cardano-api/api/utxo_transformer"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracommon "github.com/Ethernal-Tech/cardano-infrastructure/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	cache "github.com/dgraph-io/ristretto"
	goEthCommon "github.com/ethereum/go-ethereum/common"
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
		{Path: "GetBridgingAddresses", Method: http.MethodGet, Handler: c.getBridgingAddresses},
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

	currencyID, err := c.appConfig.SkylineBridgingSettings.GetCurrencyID(requestBody.SourceChainID)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)
	}

	err = c.validateAndFillOutCreateBridgingTxRequest(currencyID, &requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	txFeeInfo, bridgingRequestMetadata, err := c.calculateTxFee(r.Context(), currencyID, requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewBridgingTxFeeResponse(
		txFeeInfo.Fee, bridgingRequestMetadata.BridgingFee, bridgingRequestMetadata.OperationFee), c.logger)
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

	currencyID, err := c.appConfig.SkylineBridgingSettings.GetCurrencyID(requestBody.SourceChainID)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)
	}

	err = c.validateAndFillOutCreateBridgingTxRequest(currencyID, &requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	txInfo, bridgingRequestMetadata, err := c.createTx(r.Context(), currencyID, requestBody)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	amounts := bridgingRequestMetadata.GetOutputAmounts(currencyID)
	amounts.CurrencyLovelace -= bridgingRequestMetadata.BridgingFee + bridgingRequestMetadata.OperationFee

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewBridgingTxResponse(
			txInfo.TxRaw, txInfo.TxHash,
			bridgingRequestMetadata.BridgingFee, bridgingRequestMetadata.OperationFee,
			amounts.CurrencyLovelace, amounts.NativeTokens), c.logger,
	)
}

// @Summary Get bridge settings
// @Description Returns the participating chains with their specific settings, global bridge configuration (such as minimum and maximum allowed bridging amounts), and, for each source chain, the native token that will be received on the destination chain.
// @Tags CardanoTx
// @Produce json
// @Success 200 {object} commonResponse.SkylineSettingsResponse "OK - Returns the configuration settings."
// @Failure 401 {object} commonResponse.ErrorResponse "Unauthorized – API key missing or invalid."
// @Security ApiKeyAuth
// @Router /CardanoTx/GetSettings [get]
func (c *SkylineTxControllerImpl) getSettings(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getSettings request", "url", r.URL)

	utils.WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewSkylineSettingsResponse(c.appConfig), c.logger)
}

func (c *SkylineTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	srcCurrencyID uint16,
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

	if len(requestBody.Transactions) > c.appConfig.SkylineBridgingSettings.MaxReceiversPerBridgingRequest {
		return fmt.Errorf("number of receivers in metadata greater than maximum allowed - no: %v, max: %v, requestBody: %v",
			len(requestBody.Transactions), c.appConfig.SkylineBridgingSettings.MaxReceiversPerBridgingRequest, requestBody)
	}

	srcMinUtxoChainValue, srcFound := c.appConfig.SkylineBridgingSettings.MinUtxoChainValue[requestBody.SourceChainID]
	if !srcFound {
		return fmt.Errorf("no MinUtxoChainValue for source chain: %s", requestBody.SourceChainID)
	}

	destCurrencyID, err := c.appConfig.SkylineBridgingSettings.GetCurrencyID(requestBody.DestinationChainID)
	if err != nil {
		return err
	}

	operationFee, found := c.appConfig.SkylineBridgingSettings.MinOperationFee[requestBody.SourceChainID]
	if !found {
		return fmt.Errorf("no operation fee for chain: %s", requestBody.SourceChainID)
	}

	// this is just convenient way to setup default operation fee
	if requestBody.OperationFee == 0 {
		requestBody.OperationFee = operationFee
	}

	if requestBody.OperationFee < operationFee {
		return fmt.Errorf("operation fee in request body is less than minimum: %v", requestBody)
	}

	amountSums := make(map[uint16]*big.Int)
	feeSum := uint64(0)
	transactions := make([]commonRequest.CreateBridgingTxTransactionRequest, 0, len(requestBody.Transactions))

	for _, receiver := range requestBody.Transactions {
		if receiver.TokenID == 0 {
			receiver.TokenID = srcCurrencyID
		}

		// if fee address is specified in transactions just add amount to the fee sum
		// otherwise keep this transaction
		if (cardanoDestConfig != nil &&
			normalizeAddr(receiver.Addr) == normalizeAddr(cardanoDestConfig.BridgingAddresses.FeeAddress)) ||
			(ethDestConfig != nil && normalizeAddr(receiver.Addr) == normalizeAddr(common.EthZeroAddr)) {
			if receiver.TokenID != srcCurrencyID {
				return fmt.Errorf("fee receiver invalid. receiver: %v", receiver)
			}

			feeSum += receiver.Amount

			continue
		}

		tokenPair, err := c.appConfig.SkylineBridgingSettings.GetTokenPair(
			requestBody.SourceChainID,
			requestBody.DestinationChainID,
			receiver.TokenID,
		)
		if err != nil {
			return fmt.Errorf("requestBody: %v, err: %w", requestBody, err)
		}

		if tokenPair.SourceTokenID == srcCurrencyID {
			if receiver.Amount < srcMinUtxoChainValue {
				return fmt.Errorf(
					"found an value below minimum value in receivers, receiver: %v. min: %v",
					receiver, srcMinUtxoChainValue)
			}
		}

		if cardanoDestConfig != nil {
			if !cardanotx.IsValidOutputAddress(receiver.Addr, cardanoDestConfig.NetworkID) {
				return fmt.Errorf("found an invalid receiver addr in request body. receiver: %v", receiver)
			}

			if tokenPair.DestinationTokenID == destCurrencyID {
				dstMinUtxoChainValue, dstFound :=
					c.appConfig.SkylineBridgingSettings.MinUtxoChainValue[requestBody.DestinationChainID]
				if !dstFound {
					return fmt.Errorf("no MinUtxoChainValue for dst chain: %s", requestBody.DestinationChainID)
				}

				if receiver.Amount < dstMinUtxoChainValue {
					return fmt.Errorf(
						"found an value below minimum value in receivers, receiver: %v. min: %v",
						receiver, dstMinUtxoChainValue)
				}
			}

			if tokenPair.SourceTokenID != srcCurrencyID && tokenPair.DestinationTokenID != destCurrencyID {
				if receiver.Amount < c.appConfig.SkylineBridgingSettings.MinColCoinsAllowedToBridge {
					return fmt.Errorf(
						"found an value below minimum value in receivers, receiver: %v. min: %v",
						receiver, c.appConfig.SkylineBridgingSettings.MinColCoinsAllowedToBridge)
				}
			}
		} else {
			if !goEthCommon.IsHexAddress(receiver.Addr) {
				return fmt.Errorf("found an invalid receiver addr in request body. receiver: %v", receiver)
			}

			if tokenPair.DestinationTokenID == destCurrencyID {
				if receiver.Amount < c.appConfig.SkylineBridgingSettings.MinValueToBridge {
					return fmt.Errorf(
						"found an value below minimum value in receivers, receiver: %v. min: %v",
						receiver, c.appConfig.SkylineBridgingSettings.MinValueToBridge)
				}
			} else if receiver.Amount < c.appConfig.SkylineBridgingSettings.MinColCoinsAllowedToBridge {
				return fmt.Errorf(
					"found an value below minimum value in receivers, receiver: %v. min: %v",
					receiver, c.appConfig.SkylineBridgingSettings.MinColCoinsAllowedToBridge)
			}
		}

		if sum, ok := amountSums[tokenPair.SourceTokenID]; ok {
			sum.Add(sum, new(big.Int).SetUint64(receiver.Amount))
		} else {
			amountSums[tokenPair.SourceTokenID] = new(big.Int).SetUint64(receiver.Amount)
		}

		transactions = append(transactions, receiver)
	}

	requestBody.Transactions = transactions

	currencyAmount, currencyFound := amountSums[srcCurrencyID]
	if currencyFound {
		maxCurrAmt := c.appConfig.SkylineBridgingSettings.MaxAmountAllowedToBridge
		if maxCurrAmt != nil && maxCurrAmt.Sign() == 1 && currencyAmount.Cmp(maxCurrAmt) == 1 {
			return fmt.Errorf("sum of receiver currency amounts greater than maximum allowed: %v, for request: %v",
				maxCurrAmt, requestBody)
		}
	}

	// Remove currency entry from the map
	delete(amountSums, srcCurrencyID)

	maxTokAmnt := c.appConfig.SkylineBridgingSettings.MaxTokenAmountAllowedToBridge
	if maxTokAmnt != nil && maxTokAmnt.Sign() > 0 {
		for tokID, tokAmnt := range amountSums {
			if tokAmnt.Cmp(maxTokAmnt) == 1 {
				return fmt.Errorf(
					"sum of receiver token amounts greater than maximum allowed. tokenID: %v, maxAmnt: %v, for request: %v",
					tokID, maxTokAmnt, requestBody)
			}
		}
	}

	requestBody.BridgingFee += feeSum

	minFee, found := c.appConfig.SkylineBridgingSettings.GetMinBridgingFee(requestBody.SourceChainID, len(amountSums) > 0)
	if !found {
		return fmt.Errorf("no minimal fee for chain: %s", requestBody.SourceChainID)
	}

	// this is just convenient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = minFee
	}

	if requestBody.BridgingFee < minFee {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	return nil
}

func (c *SkylineTxControllerImpl) createTx(
	ctx context.Context, currencyID uint16, requestBody commonRequest.CreateBridgingTxRequest,
) (
	*sendtx.TxInfo, *sendtx.BridgingRequestMetadata, error,
) {
	cacheUtxosTransformer := utils.GetUtxosTransformer(requestBody, c.appConfig, c.usedUtxoCacher)

	bridgingAddress, err := utils.GetAddressToBridgeTo(
		ctx,
		c.appConfig.OracleAPI.URL,
		c.appConfig.OracleAPI.APIKey,
		requestBody.SourceChainID,
		utils.ContainsNativeTokens(currencyID, requestBody),
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
			OperationFee:           requestBody.OperationFee,
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
	currencyID uint16,
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
		utils.ContainsNativeTokens(currencyID, requestBody),
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
			OperationFee:           requestBody.OperationFee,
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

	txSender := sendtx.NewTxSender(
		txSenderChainsConfig,
		sendtx.WithUtxosTransformer(utxosTransformer),
		sendtx.WithMinAmountToBridge(c.appConfig.SkylineBridgingSettings.MinUtxoChainValue[requestBody.SourceChainID]),
	)

	receivers := make([]sendtx.BridgingTxReceiver, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = sendtx.BridgingTxReceiver{
			Addr:    tx.Addr,
			Amount:  tx.Amount,
			TokenID: tx.TokenID,
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

	calculateLockedTokens := func(cfg *core.CardanoChainConfig) (map[uint16]map[string]string, error) {
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

		tokenNames := map[string]uint16{}

		currencyID, err := c.appConfig.SkylineBridgingSettings.GetCurrencyID(cfg.ChainID)
		if err != nil {
			return nil, err
		}

		chainTokens, err := c.appConfig.SkylineBridgingSettings.GetTokens(cfg.ChainID)
		if err != nil {
			return nil, err
		}

		for tokID, tok := range chainTokens {
			token, err := wallet.NewTokenWithFullNameTry(tok.ChainSpecific)
			if err != nil {
				continue
			}

			tokenNames[token.String()] = tokID
		}

		// First accumulate per-address → token → big.Int
		perAddr := map[string]map[uint16]*big.Int{}

		ensure := func(addr string, token uint16) {
			if _, ok := perAddr[addr]; !ok {
				perAddr[addr] = map[uint16]*big.Int{}
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
				ensure(addr, currencyID)
				perAddr[addr][currencyID].Add(
					perAddr[addr][currencyID],
					new(big.Int).SetUint64(utxo.Amount),
				)

				for _, tkn := range utxo.Tokens {
					name := tkn.TokenName()

					tokID, ok := tokenNames[name]
					if !ok {
						continue
					}

					ensure(addr, tokID)

					perAddr[addr][tokID].Add(perAddr[addr][tokID], new(big.Int).SetUint64(tkn.Amount))
				}
			}
		}

		// Transpose to token → address → string
		out := map[uint16]map[string]string{}

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
	response := commonResponse.NewLockedTokensResponse(map[string]map[uint16]map[string]string{})

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

// @Summary Get bridging addresses  specific chain
// @Description Returns all bridging addresses for the given chain ID
// @Tags CardanoTx
// @Produce json
// @Param chainId query string true "Chain ID"
// @Success 200 {object} response.AllBridgingAddressesResponse "OK - Returns bridging addresses."
// @Failure 400 {object} response.ErrorResponse "Bad Request – chainId is missing from the query or invalid, or the bridging addresses could not be retrieved."
// @Failure 401 {object} response.ErrorResponse "Unauthorized – API key missing or invalid."
// @Security ApiKeyAuth
// @Router /CardanoTx/GetBridgingAddresses [get]
func (c *SkylineTxControllerImpl) getBridgingAddresses(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getBridgingAddresses request", "url", r.URL)

	queryValues := r.URL.Query()

	chainIDArr, exists := queryValues["chainId"]
	if !exists || len(chainIDArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("chainId missing from query"), c.logger)

		return
	}

	chainID := chainIDArr[0]

	bridgingAddresses, err := utils.GetAllBridgingAddress(
		r.Context(),
		c.appConfig.OracleAPI.URL,
		c.appConfig.OracleAPI.APIKey,
		chainID,
	)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("get all bridging addresses: %w", err), c.logger)

		return
	}

	utils.WriteResponse(
		w, r, http.StatusOK,
		bridgingAddresses, c.logger)
}

func normalizeAddr(addr string) string {
	addr = strings.ToLower(addr)

	return strings.TrimPrefix(addr, "0x")
}
