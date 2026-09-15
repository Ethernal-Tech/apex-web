package utils

import (
	"errors"
	"fmt"
	"net/http"

	commonResponse "github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/hashicorp/go-hclog"
)

func HandleGetLatestSlot(
	w http.ResponseWriter,
	r *http.Request,
	appConfig *core.AppConfig,
	logger hclog.Logger,
) {
	logger.Debug("getLatestSlot request", "url", r.URL)

	queryValues := r.URL.Query()

	chainIDArr, exists := queryValues["chainId"]
	if !exists || len(chainIDArr) == 0 {
		WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("chainId missing from query"), logger)

		return
	}

	chainID := chainIDArr[0]

	chainConfig, exists := appConfig.CardanoChains[chainID]
	if !exists || chainConfig == nil || !chainConfig.IsEnabled || chainConfig.ChainSpecific == nil {
		WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("cardano chain not found or disabled: %s", chainID), logger)

		return
	}

	txProvider, err := chainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("create tx provider: %w", err), logger)

		return
	}
	defer txProvider.Dispose()

	tip, err := txProvider.GetTip(r.Context())
	if err != nil {
		WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("get tip: %w", err), logger)

		return
	}

	WriteResponse(
		w, r, http.StatusOK,
		commonResponse.NewLatestSlotResponse(tip.Slot), logger)
}
