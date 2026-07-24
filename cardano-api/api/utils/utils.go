package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
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

func ContainsNativeTokens(
	currencyID uint16, requestBody commonRequest.CreateBridgingTxRequest,
) bool {
	for _, tx := range requestBody.Transactions {
		if tx.TokenID != currencyID {
			return true
		}
	}

	return false
}

func GetAddressToBridgeTo(
	ctx context.Context,
	oracleURL string,
	apiKey string,
	chainID string,
	containsNativeTokens bool) (
	*response.BridgingAddressResponse, error,
) {
	requestURL := oracleURL + fmt.Sprintf("/api/BridgingAddress/GetAddressToBridgeTo?chainId=%s&containsNativeTokens=%t",
		chainID, containsNativeTokens)

	u, err := url.Parse(requestURL)
	if err != nil {
		return nil, fmt.Errorf("parse request URL %q (chainID=%s & containsNativeTokens %t): %w",
			requestURL, chainID, containsNativeTokens, err)
	}

	return common.HTTPGet[*response.BridgingAddressResponse](
		ctx, u.String(), apiKey,
	)
}

func GetAllBridgingAddress(
	ctx context.Context,
	oracleURL string,
	apiKey string,
	chainID string,
) (*response.AllBridgingAddressesResponse, error) {
	requestURL := oracleURL + fmt.Sprintf("/api/BridgingAddress/GetAllAddresses?chainId=%s", chainID)

	u, err := url.Parse(requestURL)
	if err != nil {
		return nil, fmt.Errorf("parse request URL %q (chainID=%s): %w", requestURL, chainID, err)
	}

	return common.HTTPGet[*response.AllBridgingAddressesResponse](
		ctx, u.String(), apiKey,
	)
}

func GetMinColoredCoinsAllowedToBridge(
	chainIDSrc, chainIDDst string, settings core.SkylineBridgingSettings,
) (*big.Int, error) {
	if !common.IsCardanoChainID(chainIDSrc) && !common.IsSolanaChainID(chainIDSrc) {
		return nil, fmt.Errorf("unsupported source chain: %q", chainIDSrc)
	}

	srcRep, err := tokenRepresentationForChainID(chainIDSrc)
	if err != nil {
		return nil, err
	}

	dstRep, err := tokenRepresentationForChainID(chainIDDst)
	if err != nil {
		return nil, err
	}

	minSrc, err := minColCoinsAllowedForChain(settings, chainIDSrc)
	if err != nil {
		return nil, err
	}

	minDst, err := minColCoinsAllowedForChain(settings, chainIDDst)
	if err != nil {
		return nil, err
	}

	minSrcInSrcTokenRep, err := convertColoredCoinsAmount(minSrc, srcRep, srcRep)
	if err != nil {
		return nil, fmt.Errorf("source chain %q: %w", chainIDSrc, err)
	}

	minDstInSrcTokenRep, err := convertColoredCoinsAmount(minDst, dstRep, srcRep)
	if err != nil {
		return nil, fmt.Errorf("destination chain %q: %w", chainIDDst, err)
	}

	return common.MaxBigInt(minSrcInSrcTokenRep, minDstInSrcTokenRep), nil
}

type tokenRepresentation int

const (
	tokenRepDfm tokenRepresentation = iota
	tokenRepLamports
	tokenRepWei
)

func tokenRepresentationForChainID(chainID string) (tokenRepresentation, error) {
	switch {
	case common.IsCardanoChainID(chainID):
		return tokenRepDfm, nil
	case common.IsEvmChainID(chainID):
		return tokenRepWei, nil
	case common.IsSolanaChainID(chainID):
		return tokenRepLamports, nil
	default:
		return 0, fmt.Errorf("unknown chain id: %q", chainID)
	}
}

func minColCoinsAllowedForChain(
	settings core.SkylineBridgingSettings, chainID string,
) (*big.Int, error) {
	minAmount, found := settings.MinColCoinsAllowedToBridge[chainID]
	if !found || minAmount.Sign() == 0 {
		return nil, fmt.Errorf("no min colored coins allowed to bridge for chain: %s", chainID)
	}

	return minAmount, nil
}

func convertColoredCoinsAmount(
	amount *big.Int, from, to tokenRepresentation,
) (*big.Int, error) {
	if amount == nil {
		return nil, fmt.Errorf("amount is nil")
	}

	if from == to {
		return new(big.Int).Set(amount), nil
	}

	switch from {
	case tokenRepDfm:
		switch to {
		case tokenRepWei:
			return common.DfmToWei(amount), nil
		case tokenRepLamports:
			return common.DfmToLamports(amount), nil
		}
	case tokenRepWei:
		switch to {
		case tokenRepDfm:
			return common.WeiToDfm(amount), nil
		case tokenRepLamports:
			return common.WeiToLamports(amount), nil
		}
	case tokenRepLamports:
		switch to {
		case tokenRepDfm:
			return common.LamportsToDfm(amount), nil
		case tokenRepWei:
			return common.LamportsToWei(amount), nil
		}
	}

	return nil, fmt.Errorf("unsupported colored coins amount conversion from %d to %d", from, to)
}
