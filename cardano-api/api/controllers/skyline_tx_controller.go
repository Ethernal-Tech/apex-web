package controllers

import (
	"errors"
	"fmt"
	"math/big"
	"net/http"

	"github.com/Ethernal-Tech/cardano-api/api/model/skyline/request"
	"github.com/Ethernal-Tech/cardano-api/api/model/skyline/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	"github.com/Ethernal-Tech/cardano-api/core"
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

	chainIDArr, exists := queryValues["chainId"]
	if !exists || len(chainIDArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("chainId missing from query"), c.logger)

		return
	}

	addressArr, exists := queryValues["address"]
	if !exists || len(addressArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("address missing from query"), c.logger)

		return
	}

	chainID := chainIDArr[0]
	address := addressArr[0]

	_ = chainID
	_ = address

	// a TODO: get balance

	balances := map[string]*big.Int{
		"Ada":  big.NewInt(0),
		"WAda": big.NewInt(0),
	}
	utils.WriteResponse(w, r, http.StatusOK, response.NewBalanceResponse(balances), c.logger)
}

func (c *SkylineTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
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

	// a TODO: get fee

	var fee uint64

	utils.WriteResponse(w, r, http.StatusOK, response.NewBridgingTxFeeResponse(fee), c.logger)
}

func (c *SkylineTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
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

	// a TODO: create bridging tx

	var txRawBytes []byte

	var txHash string

	utils.WriteResponse(
		w, r, http.StatusOK,
		response.NewFullBridgingTxResponse(txRawBytes, txHash, requestBody.BridgingFee), c.logger)
}

func (c *SkylineTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *request.CreateBridgingTxRequest,
) error {
	cardanoSrcConfig, _ := core.GetChainConfig(c.appConfig, requestBody.SourceChainID)
	if cardanoSrcConfig == nil {
		return fmt.Errorf("origin chain not registered: %v", requestBody.SourceChainID)
	}

	cardanoDestConfig, _ := core.GetChainConfig(c.appConfig, requestBody.DestinationChainID)
	if cardanoDestConfig == nil {
		return fmt.Errorf("destination chain not registered: %v", requestBody.DestinationChainID)
	}

	// a TODO:

	return nil
}
