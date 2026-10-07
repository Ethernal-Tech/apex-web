package controllers

import (
	"errors"
	"net/http"
	"strconv"

	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-api/txindexer"
	"github.com/hashicorp/go-hclog"
)

type BridgingTxControllerImpl struct {
	store     txindexer.BridgingTxsStore
	pullLimit int
	logger    hclog.Logger
}

var _ core.APIController = (*BridgingTxControllerImpl)(nil)

func NewBridgingTxController(
	store txindexer.BridgingTxsStore, pullLimit int, logger hclog.Logger,
) *BridgingTxControllerImpl {
	return &BridgingTxControllerImpl{
		store:     store,
		pullLimit: pullLimit,
		logger:    logger,
	}
}

func (*BridgingTxControllerImpl) GetPathPrefix() string {
	return "BridgingTx"
}

func (c *BridgingTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "GetNew", Method: http.MethodGet, Handler: c.getNew},
	}
}

// @Summary Get newly indexed bridging transactions
// @Description Returns bridging transactions observed on source chains (without confirmations) with sequence number greater than `after`, ordered by sequence number
// @Tags BridgingTx
// @Produce json
// @Param after query int false "Sequence number of the last already received transaction (0 to start from the beginning)"
// @Param limit query int false "Maximum number of returned transactions"
// @Success 200 {object} response.NewBridgingTxsResponse "OK - Indexed bridging transactions."
// @Failure 400 {object} response.ErrorResponse "Bad Request – invalid query params."
// @Failure 401 {object} response.ErrorResponse "Unauthorized – API key missing or invalid."
// @Security ApiKeyAuth
// @Router /BridgingTx/GetNew [get]
func (c *BridgingTxControllerImpl) getNew(w http.ResponseWriter, r *http.Request) {
	queryValues := r.URL.Query()

	var after uint64

	if value := queryValues.Get("after"); value != "" {
		parsed, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			utils.WriteErrorResponse(w, r, http.StatusBadRequest, errors.New("invalid after"), c.logger)

			return
		}

		after = parsed
	}

	limit := c.pullLimit

	if value := queryValues.Get("limit"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed <= 0 {
			utils.WriteErrorResponse(w, r, http.StatusBadRequest, errors.New("invalid limit"), c.logger)

			return
		}

		limit = min(parsed, c.pullLimit)
	}

	page, err := c.store.GetBridgingTxs(after, limit)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	utils.WriteResponse(w, r, http.StatusOK, commonResponse.NewNewBridgingTxsResponse(page, after), c.logger)
}
