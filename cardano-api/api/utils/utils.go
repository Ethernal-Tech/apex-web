package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/Ethernal-Tech/cardano-api/api/model/common/response"

	commonRequest "github.com/Ethernal-Tech/cardano-api/api/model/common/request"
	utxotransformer "github.com/Ethernal-Tech/cardano-api/api/utxo_transformer"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
)

func WriteResponse(w http.ResponseWriter, r *http.Request, status int, response any, logger hclog.Logger) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		logger.Error("write response error", "url", r.URL, "status", status, "err", err)
	}
}

func WriteErrorResponse(w http.ResponseWriter, r *http.Request, status int, err error, logger hclog.Logger) {
	logger.Error("error happened", "url", r.URL, "status", status, "err", err)

	WriteResponse(w, r, status, response.ErrorResponse{Err: err.Error()}, logger)
}

func WriteUnauthorizedResponse(w http.ResponseWriter, r *http.Request, logger hclog.Logger) {
	WriteErrorResponse(w, r, http.StatusUnauthorized, errors.New("Unauthorized"), logger)
}

func DecodeModel[T any](w http.ResponseWriter, r *http.Request, logger hclog.Logger) (T, bool) {
	var requestBody T

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		WriteErrorResponse(w, r, http.StatusBadRequest, fmt.Errorf("bad request: %w", err), logger)

		return requestBody, false
	}

	return requestBody, true
}

func GetUtxosTransformer(
	requestBody commonRequest.CreateBridgingTxRequest,
	appConfig *core.AppConfig,
	usedUtxoCacher *utxotransformer.UsedUtxoCacher,
) utxotransformer.IUtxosTransformer {
	if useUtxoCache(requestBody, appConfig) {
		return &utxotransformer.CacheUtxosTransformer{
			UtxoCacher: usedUtxoCacher,
			Addr:       requestBody.SenderAddr,
		}
	}

	if len(requestBody.SkipUtxos) > 0 {
		return &utxotransformer.SkipUtxosTransformer{
			SkipUtxos: common.Map(requestBody.SkipUtxos, func(a commonRequest.UtxoRequest) wallet.TxInput {
				return wallet.TxInput{
					Hash:  a.Hash,
					Index: a.Index,
				}
			}),
		}
	}

	return nil
}

func useUtxoCache(
	requestBody commonRequest.CreateBridgingTxRequest, appConfig *core.AppConfig,
) (useCaching bool) {
	if desiredKey := requestBody.UTXOCacheKey; desiredKey != "" {
		for _, key := range appConfig.APIConfig.UTXOCacheKeys {
			if key == desiredKey {
				return true
			}
		}
	}

	return false
}

func GetBridgingAddress(
	ctx context.Context,
	oracleURL string,
	apiKey string,
	chainID, amount string) (
	*response.BridgingAddressResponse, error,
) {
	requestURL := oracleURL + "/api/BridgingAddress/Get"

	u, err := url.Parse(requestURL)
	if err != nil {
		log.Fatal(err)
	}

	q := u.Query()
	q.Set("chainId", chainID)
	q.Set("amount", amount)
	u.RawQuery = q.Encode()

	addressResponse, err := common.HTTPGet[*response.BridgingAddressResponse](
		ctx, u.String(), apiKey,
	)
	if err != nil {
		return nil, err
	}

	return addressResponse, nil
}

func GetAllBridgingAddress(ctx context.Context, oracleURL string, apiKey string, chainID string) ([]string, error) {
	requestURL := oracleURL + "/api/BridgingAddress/GetAllAddresses"

	u, err := url.Parse(requestURL)
	if err != nil {
		log.Fatal(err)
	}

	q := u.Query()
	q.Set("chainId", chainID)
	u.RawQuery = q.Encode()

	addressResponse, err := common.HTTPGet[[]string](
		ctx, u.String(), apiKey,
	)
	if err != nil {
		return nil, err
	}

	return addressResponse, nil
}
