package core

import (
	"context"
	"fmt"
	"math/big"
	"time"

	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
)

type APIConfig struct {
	Port           uint32   `json:"port"`
	PathPrefix     string   `json:"pathPrefix"`
	AllowedHeaders []string `json:"allowedHeaders"`
	AllowedOrigins []string `json:"allowedOrigins"`
	AllowedMethods []string `json:"allowedMethods"`
	APIKeyHeader   string   `json:"apiKeyHeader"`
	APIKeys        []string `json:"apiKeys"`
	UTXOCacheKeys  []string `json:"utxoCacheKeys"`
}

type BridgingAddresses struct {
	BridgingAddress string `json:"address"`
	FeeAddress      string `json:"feeAddress"`
	FallbackAddress string `json:"fallbackAddress"`
}

type EthChainConfig struct {
	ChainID   string `json:"-"`
	IsEnabled bool   `json:"isEnabled"`
}

type CardanoChainConfig struct {
	ChainID           string                           `json:"-"`
	NetworkMagic      uint32                           `json:"networkMagic"`
	NetworkID         cardanowallet.CardanoNetworkType `json:"networkID"`
	BridgingAddresses BridgingAddresses                `json:"bridgingAddresses"`
	ChainSpecific     *cardanotx.CardanoChainConfig    `json:"chainSpecific"`
	IsEnabled         bool                             `json:"isEnabled"`
}

type OracleAPISettings struct {
	URL    string `json:"url"`
	APIKey string `json:"apiKey"`
}

type AppSettings struct {
	Logger logger.LoggerConfig `json:"logger"`
}

type BridgingSettings struct {
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
	// Minimum value allowed to be bridged
	MinValueToBridge uint64 `json:"minValueToBridge"`
	// Maximum amount of currency allowed to be bridged
	MaxAmountAllowedToBridge *big.Int `json:"maxAmountAllowedToBridge" swaggertype:"string"`
	// Maximum amount of native tokens allowed to be bridged
	MaxTokenAmountAllowedToBridge *big.Int `json:"maxTokenAmountAllowedToBridge" swaggertype:"string"`
	// Maximum number of receivers allowed in a bridging request
	MaxReceiversPerBridgingRequest int `json:"maxReceiversPerBridgingRequest"`
	// Allowed directions map [src chain] => list of dst chains
	AllowedDirections map[string][]string `json:"allowedDirections"`
} // @name BridgingSettings

type AppConfig struct {
	RunMode          common.VCRunMode               `json:"runMode"`
	CardanoChains    map[string]*CardanoChainConfig `json:"cardanoChains"`
	EthChains        map[string]*EthChainConfig     `json:"ethChains"`
	UtxoCacheTimeout time.Duration                  `json:"utxoCacheTimeout"`
	OracleAPI        OracleAPISettings              `json:"oracleApi"`
	Settings         AppSettings                    `json:"appSettings"`
	BridgingSettings BridgingSettings               `json:"-"`
	APIConfig        APIConfig                      `json:"api"`
}

func (appConfig *AppConfig) FillOut(ctx context.Context, logger hclog.Logger) error {
	for chainID, cardanoChainConfig := range appConfig.CardanoChains {
		cardanoChainConfig.ChainID = chainID
		cardanoChainConfig.ChainSpecific.NetworkID = cardanoChainConfig.NetworkID
		cardanoChainConfig.ChainSpecific.NetworkMagic = cardanoChainConfig.NetworkMagic
	}

	for chainID, ethChainConfig := range appConfig.EthChains {
		ethChainConfig.ChainID = chainID
	}

	settingsRequestURL := fmt.Sprintf("%s/api/Settings/Get", appConfig.OracleAPI.URL)

	logger.Debug("fetching settings from oracle API", "url", settingsRequestURL)

	err := common.RetryForever(ctx, 5*time.Second, func(ctx context.Context) error {
		settingsResponse, err := common.HTTPGet[*SettingsResponse](
			ctx, settingsRequestURL, appConfig.OracleAPI.APIKey)
		if err != nil {
			logger.Error("failed to fetch settings from oracle API", "err", err)

			return err
		}

		maxAmountAllowedToBridge, ok := new(big.Int).SetString(settingsResponse.MaxAmountAllowedToBridge, 10)
		if !ok {
			logger.Error("failed to convert MaxAmountAllowedToBridge to big.Int",
				"MaxAmountAllowedToBridge", settingsResponse.MaxAmountAllowedToBridge)

			maxAmountAllowedToBridge = big.NewInt(0)
		}

		maxTokenAmountAllowedToBridge, ok := new(big.Int).SetString(settingsResponse.MaxTokenAmountAllowedToBridge, 10)
		if !ok {
			logger.Error("failed to convert MaxTokenAmountAllowedToBridge to big.Int",
				"MaxTokenAmountAllowedToBridge", settingsResponse.MaxTokenAmountAllowedToBridge)

			maxTokenAmountAllowedToBridge = big.NewInt(0)
		}

		appConfig.BridgingSettings = BridgingSettings{
			MinChainFeeForBridging:         settingsResponse.MinChainFeeForBridging,
			MinChainFeeForBridgingTokens:   settingsResponse.MinChainFeeForBridgingTokens,
			MinOperationFee:                settingsResponse.MinOperationFee,
			MinUtxoChainValue:              settingsResponse.MinUtxoChainValue,
			MinValueToBridge:               settingsResponse.MinValueToBridge,
			MaxAmountAllowedToBridge:       maxAmountAllowedToBridge,
			MaxTokenAmountAllowedToBridge:  maxTokenAmountAllowedToBridge,
			MaxReceiversPerBridgingRequest: settingsResponse.MaxReceiversPerBridgingRequest,
			AllowedDirections:              settingsResponse.AllowedDirections,
		}

		for chainID, cardanoChainConfig := range appConfig.CardanoChains {
			if tokens, ok := settingsResponse.NativeTokens[chainID]; ok {
				cardanoChainConfig.ChainSpecific.NativeTokens = tokens
			}
		}

		logger.Debug("applied settings from oracle API", "settings", settingsResponse)

		return nil
	})

	return err
}

func GetChainConfig(appConfig *AppConfig, chainID string) (*CardanoChainConfig, *EthChainConfig) {
	if cardanoChainConfig, exists := appConfig.CardanoChains[chainID]; exists && cardanoChainConfig.IsEnabled {
		return cardanoChainConfig, nil
	}

	if ethChainConfig, exists := appConfig.EthChains[chainID]; exists && ethChainConfig.IsEnabled {
		return nil, ethChainConfig
	}

	return nil, nil
}

func (appConfig AppConfig) ToSendTxChainConfigs(useFallback bool) (map[string]sendtx.ChainConfig, error) {
	result := make(map[string]sendtx.ChainConfig, len(appConfig.CardanoChains)+len(appConfig.EthChains))

	for chainID, cardanoConfig := range appConfig.CardanoChains {
		cfg, err := cardanoConfig.ToSendTxChainConfig(&appConfig, useFallback)
		if err != nil {
			return nil, err
		}

		result[chainID] = cfg
	}

	for chainID, config := range appConfig.EthChains {
		result[chainID] = config.ToSendTxChainConfig(&appConfig)
	}

	return result, nil
}

func (config CardanoChainConfig) ToSendTxChainConfig(
	appConfig *AppConfig, useFallback bool,
) (res sendtx.ChainConfig, err error) {
	txProvider, err := config.ChainSpecific.CreateTxProvider()
	if err != nil {
		return res, err
	}

	bridgingAddress := config.BridgingAddresses.BridgingAddress
	if useFallback {
		bridgingAddress = config.BridgingAddresses.FallbackAddress
	}

	return sendtx.ChainConfig{
		CardanoCliBinary:         cardanowallet.ResolveCardanoCliBinary(config.NetworkID),
		TxProvider:               txProvider,
		MultiSigAddr:             bridgingAddress,
		TestNetMagic:             uint(config.NetworkMagic),
		TTLSlotNumberInc:         config.ChainSpecific.TTLSlotNumberInc,
		MinUtxoValue:             appConfig.BridgingSettings.MinUtxoChainValue[config.ChainID],
		NativeTokens:             config.ChainSpecific.NativeTokens,
		DefaultMinFeeForBridging: appConfig.BridgingSettings.MinChainFeeForBridging[config.ChainID],
		MinFeeForBridgingTokens:  appConfig.BridgingSettings.MinChainFeeForBridgingTokens[config.ChainID],
		MinOperationFeeAmount:    appConfig.BridgingSettings.MinOperationFee[config.ChainID],
		PotentialFee:             config.ChainSpecific.PotentialFee,
		ProtocolParameters:       nil,
	}, nil
}

func (config EthChainConfig) ToSendTxChainConfig(
	appConfig *AppConfig,
) sendtx.ChainConfig {
	feeValue := new(big.Int).SetUint64(appConfig.BridgingSettings.MinChainFeeForBridging[config.ChainID])

	if len(feeValue.String()) == common.WeiDecimals {
		feeValue = common.WeiToDfm(feeValue)
	}

	return sendtx.ChainConfig{
		DefaultMinFeeForBridging: feeValue.Uint64(),
	}
}

func (settings BridgingSettings) GetMinBridgingFee(chainID string, isNativeToken bool) (
	fee uint64, found bool,
) {
	if isNativeToken {
		fee, found = settings.MinChainFeeForBridgingTokens[chainID]
	} else {
		fee, found = settings.MinChainFeeForBridging[chainID]
	}

	return fee, found
}
