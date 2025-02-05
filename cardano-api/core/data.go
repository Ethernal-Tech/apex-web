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

type SettingsResponse struct {
	MinChainFeeForBridging         map[string]uint64 `json:"minChainFeeForBridging"`
	MinUtxoChainValue              map[string]uint64 `json:"minUtxoChainValue"`
	MinValueToBridge               uint64            `json:"minValueToBridge"`
	MaxAmountAllowedToBridge       string            `json:"maxAmountAllowedToBridge"`
	MaxReceiversPerBridgingRequest int               `json:"maxReceiversPerBridgingRequest"`
}
