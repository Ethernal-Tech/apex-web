package core

import (
	"net/http"
)

type APIEndpointHandler = func(w http.ResponseWriter, r *http.Request)

type APIEndpoint struct {
	Path         string
	Method       string
	Handler      APIEndpointHandler
	NoAPIKeyAuth bool
}

type ReactorSettingsResponse struct {
	// For each chain, the minimum fee required to cover the submission of the currency transaction
	// on the destination chain
	MinChainFeeForBridging map[string]uint64 `json:"minChainFeeForBridging"`
	// For each chain, the minimum allowed UTXO value
	MinUtxoChainValue map[string]uint64 `json:"minUtxoChainValue"`
	// Minimum value allowed to be bridged
	MinValueToBridge uint64 `json:"minValueToBridge"`
	// Maximum amount of currency allowed to be bridged
	MaxAmountAllowedToBridge string `json:"maxAmountAllowedToBridge"`
	// Maximum number of receivers allowed in a bridging request
	MaxReceiversPerBridgingRequest int `json:"maxReceiversPerBridgingRequest"`
	// Allowed directions map [src chain] => list of dst chains
	AllowedDirections map[string][]string `json:"allowedDirections"`
}

type SkylineSettingsResponse struct {
	// For each chain, the minimum fee required to cover the submission of the currency transaction
	// on the destination chain
	MinChainFeeForBridging map[string]uint64 `json:"minChainFeeForBridging"`
	// For each chain, the minimum fee required to cover the submission of the native token transaction
	// on the destination chain
	MinChainFeeForBridgingTokens map[string]uint64 `json:"minChainFeeForBridgingTokens"`
	// For each chain, the minimum fee required to cover operational costs
	MinOperationFee map[string]uint64 `json:"minOperationFee"`
	// For each chain, the minimum allowed UTXO value
	MinUtxoChainValue map[string]uint64 `json:"minUtxoChainValue"`
	// For each chain, the direction config
	DirectionConfig map[string]DirectionConfig `json:"directionConfig"`
	// All defined tokens across the whole ecosystem
	EcosystemTokens []EcosystemToken `json:"ecosystemTokens"`
	// Minimum value allowed to be bridged
	MinValueToBridge uint64 `json:"minValueToBridge"`
	// Maximum amount of currency allowed to be bridged
	MaxAmountAllowedToBridge string `json:"maxAmountAllowedToBridge"`
	// Maximum amount of native tokens allowed to be bridged
	MaxTokenAmountAllowedToBridge string `json:"maxTokenAmountAllowedToBridge"`
	// Minimum amount of colored tokens allowed to be bridged
	MinColCoinsAllowedToBridge string `json:"minColCoinsAllowedToBridge"`
	// Maximum number of receivers allowed in a bridging request
	MaxReceiversPerBridgingRequest int `json:"maxReceiversPerBridgingRequest"`
}

type MultiSigAddressesResponse struct {
	CardanoChains map[string]BridgingAddresses `json:"bridgingAddress"`
}
