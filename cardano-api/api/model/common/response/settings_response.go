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
} // @name SettingsResponse

func NewSettingsResponse(
	config *core.AppConfig,
) *SettingsResponse {
	isEnabled := map[string]bool{}

	nativeTokens := map[string][]sendtx.TokenExchangeConfig{}
	for chainID, cfg := range config.CardanoChains {
		nativeTokens[chainID] = cfg.ChainSpecific.NativeTokens
		isEnabled[chainID] = cfg.IsEnabled
	}

	for chainID, cfg := range config.EthChains {
		isEnabled[chainID] = cfg.IsEnabled
	}

	bridgingSettings := config.BridgingSettings
	bridgingSettings.AllowedDirections = map[string][]string{}

	for chainID, chains := range config.BridgingSettings.AllowedDirections {
		if !isEnabled[chainID] {
			continue
		}

		var directions []string

		for _, dstChainID := range chains {
			if isEnabled[dstChainID] {
				directions = append(directions, dstChainID)
			}
		}

		bridgingSettings.AllowedDirections[chainID] = directions
	}

	return &SettingsResponse{
		RunMode:                   config.RunMode,
		CardanoChainsNativeTokens: nativeTokens,
		BridgingSettings:          bridgingSettings,
	}
}
