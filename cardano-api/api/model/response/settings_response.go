package response

import "github.com/Ethernal-Tech/cardano-api/core"

type SettingsResponse struct {
	BridgingSettings core.BridgingSettings `json:"bridgingSettings"`
	EnabledChains    []string              `json:"enabledChains"`
}

func NewSettingsResponse(
	config *core.AppConfig,
) *SettingsResponse {
	return &SettingsResponse{
		BridgingSettings: config.BridgingSettings,
		EnabledChains:    config.CreateEnabledChains(),
	}
}

type ValidatorChangeStatusReponse struct {
	InProgress bool `json:"inProgress"`
}
