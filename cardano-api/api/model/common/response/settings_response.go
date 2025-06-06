package response

import (
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
)

type SettingsReponse struct {
	RunMode                   common.VCRunMode                        `json:"runMode"`
	CardanoChainsNativeTokens map[string][]sendtx.TokenExchangeConfig `json:"cardanoChainsNativeTokens"`
	BridgingSettings          core.BridgingSettings                   `json:"bridgingSettings"`
}

func NewSettingsReponse(
	config *core.AppConfig,
) *SettingsReponse {
	nativeTokens := map[string][]sendtx.TokenExchangeConfig{}
	for chainID, cfg := range config.CardanoChains {
		nativeTokens[chainID] = cfg.ChainSpecific.NativeTokens
	}

	return &SettingsReponse{
		RunMode:                   config.RunMode,
		CardanoChainsNativeTokens: nativeTokens,
		BridgingSettings:          config.BridgingSettings,
	}
}
