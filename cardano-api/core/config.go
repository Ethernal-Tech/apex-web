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
	ChainID string `json:"-"`
}

type CardanoChainConfig struct {
	ChainID           string                           `json:"-"`
	NetworkMagic      uint32                           `json:"networkMagic"`
	NetworkID         cardanowallet.CardanoNetworkType `json:"networkID"`
	BridgingAddresses BridgingAddresses                `json:"bridgingAddresses"`
	ChainSpecific     *cardanotx.CardanoChainConfig    `json:"chainSpecific"`
}

type OracleAPISettings struct {
	URL    string `json:"url"`
	APIKey string `json:"apiKey"`
}

type AppSettings struct {
	Logger logger.LoggerConfig `json:"logger"`
}

type BridgingSettings struct {
	MinChainFeeForBridging         map[string]uint64 `json:"minChainFeeForBridging"`
	MinUtxoChainValue              map[string]uint64 `json:"minUtxoChainValue"`
	MinValueToBridge               uint64            `json:"minValueToBridge"`
	MaxAmountAllowedToBridge       *big.Int          `json:"maxAmountAllowedToBridge"`
	MaxReceiversPerBridgingRequest int               `json:"maxReceiversPerBridgingRequest"`
}

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
		}

		appConfig.BridgingSettings = BridgingSettings{
			MinChainFeeForBridging:         settingsResponse.MinChainFeeForBridging,
			MinUtxoChainValue:              settingsResponse.MinUtxoChainValue,
			MinValueToBridge:               settingsResponse.MinValueToBridge,
			MaxAmountAllowedToBridge:       maxAmountAllowedToBridge,
			MaxReceiversPerBridgingRequest: settingsResponse.MaxReceiversPerBridgingRequest,
		}

		logger.Debug("applied settings from oracle API", "settings", settingsResponse)

		return nil
	})

	return err
}

func GetChainConfig(appConfig *AppConfig, chainID string) (*CardanoChainConfig, *EthChainConfig) {
	if cardanoChainConfig, exists := appConfig.CardanoChains[chainID]; exists {
		return cardanoChainConfig, nil
	}

	if ethChainConfig, exists := appConfig.EthChains[chainID]; exists {
		return nil, ethChainConfig
	}

	return nil, nil
}

func (appConfig AppConfig) ToSendTxChainConfigs() (map[string]sendtx.ChainConfig, error) {
	result := make(map[string]sendtx.ChainConfig, len(appConfig.CardanoChains)+len(appConfig.EthChains))

	for chainID, cardanoConfig := range appConfig.CardanoChains {
		cfg, err := cardanoConfig.ToSendTxChainConfig(&appConfig)
		if err != nil {
			return nil, err
		}

		result[chainID] = cfg
	}

	for chainID, config := range appConfig.EthChains {
		result[chainID] = config.ToSendTxChainConfig()
	}

	return result, nil
}

func (config CardanoChainConfig) ToSendTxChainConfig(
	appConfig *AppConfig,
) (res sendtx.ChainConfig, err error) {
	txProvider, err := config.ChainSpecific.CreateTxProvider()
	if err != nil {
		return res, err
	}

	var nativeTokens []sendtx.TokenExchangeConfig

	for _, tdst := range config.ChainSpecific.Destinations {
		if tdst.SrcTokenName != cardanowallet.AdaTokenName {
			nativeTokens = append(nativeTokens, sendtx.TokenExchangeConfig{
				DstChainID: tdst.Chain,
				TokenName:  tdst.SrcTokenName,
			})
		}
	}

	return sendtx.ChainConfig{
		CardanoCliBinary:     cardanowallet.ResolveCardanoCliBinary(config.NetworkID),
		TxProvider:           txProvider,
		MultiSigAddr:         config.BridgingAddresses.BridgingAddress,
		TestNetMagic:         uint(config.NetworkMagic),
		TTLSlotNumberInc:     config.ChainSpecific.TTLSlotNumberInc,
		MinUtxoValue:         appConfig.BridgingSettings.MinUtxoChainValue[config.ChainID],
		NativeTokens:         nativeTokens,
		MinBridgingFeeAmount: appConfig.BridgingSettings.MinChainFeeForBridging[config.ChainID],
		PotentialFee:         config.ChainSpecific.PotentialFee,
		ProtocolParameters:   nil,
	}, nil
}

func (config EthChainConfig) ToSendTxChainConfig() sendtx.ChainConfig {
	return sendtx.ChainConfig{}
}
