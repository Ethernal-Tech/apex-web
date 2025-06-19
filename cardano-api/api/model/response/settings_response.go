package response

import (
	"github.com/Ethernal-Tech/cardano-api/core"
)

type SettingsResponse struct {
	BridgingSettings core.BridgingSettings `json:"bridgingSettings"`
	EnabledChains    []string              `json:"enabledChains"`
}

func NewSettingsResponse(
	config *core.AppConfig,
) *SettingsResponse {
	var enabledChains []string

	for chainID, cfg := range config.CardanoChains {
		if cfg.IsEnabled {
			enabledChains = append(enabledChains, chainID)
		}
	}

	for chainID, cfg := range config.EthChains {
		if cfg.IsEnabled {
			enabledChains = append(enabledChains, chainID)
		}
	}

	return &SettingsResponse{
		BridgingSettings: config.BridgingSettings,
		EnabledChains:    enabledChains,
	}
}
