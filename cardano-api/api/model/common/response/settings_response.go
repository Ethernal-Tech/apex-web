package response

import (
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
)

type SettingsResponse struct {
	// Specifies the current operating mode of the application
	RunMode common.VCRunMode `json:"runMode"`
	// For each source chain, defines the native token that will be received on the destination chain
	CardanoChainsNativeTokens map[string][]sendtx.TokenExchangeConfig `json:"cardanoChainsNativeTokens"`
	// Settings for bridge
	BridgingSettings core.BridgingSettings `json:"bridgingSettings"`
	// Participating chains in the bridge
	EnabledChains []string `json:"enabledChains"`
} //@name SettingsResponse

func NewSettingsResponse(
	config *core.AppConfig,
) *SettingsResponse {
	var enabledChains []string

	nativeTokens := map[string][]sendtx.TokenExchangeConfig{}
	for chainID, cfg := range config.CardanoChains {
		nativeTokens[chainID] = cfg.ChainSpecific.NativeTokens

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
		RunMode:                   config.RunMode,
		CardanoChainsNativeTokens: nativeTokens,
		BridgingSettings:          config.BridgingSettings,
		EnabledChains:             enabledChains,
	}
}
