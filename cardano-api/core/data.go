package core

import (
	"net/http"
)

type APIEndpointHandler = func(w http.ResponseWriter, r *http.Request)

type APIEndpoint struct {
	Path       string
	Method     string
	Handler    APIEndpointHandler
	APIKeyAuth bool
}

type SettingsResponse struct {
	MinFeeForBridging              uint64 `json:"minFeeForBridging"`
	MinUtxoValue                   uint64 `json:"minUtxoValue"`
	MaxAmountAllowedToBridge       string `json:"maxAmountAllowedToBridge"`
	MaxReceiversPerBridgingRequest int    `json:"maxReceiversPerBridgingRequest"`
}
