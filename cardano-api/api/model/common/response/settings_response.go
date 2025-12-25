package response

import (
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
)

type ReactorSettingsResponse struct {
	// Specifies the current operating mode of the application
	RunMode common.VCRunMode `json:"runMode"`
	// Settings for bridge
	BridgingSettings core.ReactorBridgingSettings `json:"bridgingSettings"`
	// Participating chains in the bridge
	EnabledChains []string `json:"enabledChains"`
} // @name SettingsResponse

func NewReactorSettingsResponse(
	config *core.AppConfig,
) *ReactorSettingsResponse {
	enabledChains := config.CreateEnabledChains()

	return &ReactorSettingsResponse{
		RunMode:          config.RunMode,
		BridgingSettings: config.ReactorBridgingSettings,
		EnabledChains:    enabledChains,
	}
}

type SkylineSettingsResponse struct {
	// Specifies the current operating mode of the application
	RunMode common.VCRunMode `json:"runMode"`
	// Settings for bridge
	BridgingSettings core.SkylineBridgingSettings `json:"bridgingSettings"`
	// Participating chains in the bridge
	EnabledChains []string `json:"enabledChains"`
} // @name SettingsResponse

func NewSkylineSettingsResponse(
	config *core.AppConfig,
) *SkylineSettingsResponse {
	enabledChains := config.CreateEnabledChains()

	return &SkylineSettingsResponse{
		RunMode:          config.RunMode,
		BridgingSettings: config.SkylineBridgingSettings,
		EnabledChains:    enabledChains,
	}
}

type ValidatorChangeStatusReponse struct {
	InProgress bool `json:"inProgress"`
}
