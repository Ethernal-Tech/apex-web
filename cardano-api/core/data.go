package core

import (
	"net/http"

	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
)

type APIEndpointHandler = func(w http.ResponseWriter, r *http.Request)

type APIEndpoint struct {
	Path         string
	Method       string
	Handler      APIEndpointHandler
	NoAPIKeyAuth bool
}

type SettingsResponse struct {
	MinChainFeeForBridging         map[string]uint64                       `json:"minChainFeeForBridging"`
	MinChainFeeForBridgingTokens   map[string]uint64                       `json:"minChainFeeForBridgingTokens"`
	MinOperationFee                map[string]uint64                       `json:"minOperationFee"`
	MinUtxoChainValue              map[string]uint64                       `json:"minUtxoChainValue"`
	MinValueToBridge               uint64                                  `json:"minValueToBridge"`
	MaxAmountAllowedToBridge       string                                  `json:"maxAmountAllowedToBridge"`
	MaxTokenAmountAllowedToBridge  string                                  `json:"maxTokenAmountAllowedToBridge"`
	MaxReceiversPerBridgingRequest int                                     `json:"maxReceiversPerBridgingRequest"`
	AllowedDirections              map[string][]string                     `json:"allowedDirections"`
	NativeTokens                   map[string][]sendtx.TokenExchangeConfig `json:"nativeTokens"`
}

type MultiSigAddressesResponse struct {
	CardanoChains map[string]BridgingAddresses `json:"bridgingAddress"`
}
