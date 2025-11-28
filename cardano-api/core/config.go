package core

import (
	"context"
	"fmt"
	"math/big"
	"sync"
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
	MinChainFeeForBridging         map[string]uint64   `json:"minChainFeeForBridging"`
	MinUtxoChainValue              map[string]uint64   `json:"minUtxoChainValue"`
	MinValueToBridge               uint64              `json:"minValueToBridge"`
	MaxAmountAllowedToBridge       *big.Int            `json:"maxAmountAllowedToBridge"`
	MaxReceiversPerBridgingRequest int                 `json:"maxReceiversPerBridgingRequest"`
	AllowedDirections              map[string][]string `json:"allowedDirections"`
}

type AppConfig struct {
	cardanoChainsMu sync.RWMutex
	CardanoChains   map[string]*CardanoChainConfig `json:"cardanoChains"`

	EthChains        map[string]*EthChainConfig `json:"ethChains"`
	UtxoCacheTimeout time.Duration              `json:"utxoCacheTimeout"`
	OracleAPI        OracleAPISettings          `json:"oracleApi"`
	Settings         AppSettings                `json:"appSettings"`
	BridgingSettings BridgingSettings           `json:"-"`
	APIConfig        APIConfig                  `json:"api"`
}

func (appConfig *AppConfig) FillOut(ctx context.Context, logger hclog.Logger) error {
	appConfig.cardanoChainsMu.Lock()

	for chainID, cardanoChainConfig := range appConfig.CardanoChains {
		cardanoChainConfig.ChainID = chainID
		cardanoChainConfig.ChainSpecific.NetworkID = cardanoChainConfig.NetworkID
		cardanoChainConfig.ChainSpecific.NetworkMagic = cardanoChainConfig.NetworkMagic
	}

	appConfig.cardanoChainsMu.Unlock()

	for chainID, ethChainConfig := range appConfig.EthChains {
		ethChainConfig.ChainID = chainID
	}

	settingsRequestURL := fmt.Sprintf("%s/api/Settings/Get", appConfig.OracleAPI.URL)

	logger.Debug("fetching settings from oracle API", "url", settingsRequestURL)

	return common.RetryForever(ctx, 5*time.Second, func(ctx context.Context) error {
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
			AllowedDirections:              settingsResponse.AllowedDirections,
		}

		logger.Debug("applied settings from oracle API", "settings", settingsResponse)

		return nil
	})
}

func (appConfig *AppConfig) FetchAndUpdateMultiSigAddresses(ctx context.Context, logger hclog.Logger) error {
	multiSigAddrRequestURL := fmt.Sprintf("%s/api/Settings/GetMultiSigBridgingAddr", appConfig.OracleAPI.URL)

	logger.Debug("fetching multisig addresses from oracle API", "url", multiSigAddrRequestURL)

	return common.RetryForever(ctx, 5*time.Second, func(ctx context.Context) error {
		multiSigAddrResponse, err := common.HTTPGet[*MultiSigAddressesResponse](
			ctx, multiSigAddrRequestURL, appConfig.OracleAPI.APIKey)
		if err != nil {
			return err
		}

		appConfig.updateMultisigAddresses(logger, multiSigAddrResponse.CardanoChains)

		logger.Debug("applied multisig addresses from oracle API", "multiSigAddr", multiSigAddrResponse)

		return nil
	})
}

func (appConfig *AppConfig) updateMultisigAddresses(
	logger hclog.Logger,
	addresses map[string]BridgingAddresses) {
	appConfig.cardanoChainsMu.Lock()
	defer appConfig.cardanoChainsMu.Unlock()

	for chainID, multiSigAddr := range addresses {
		if chainConfig, ok := appConfig.CardanoChains[chainID]; ok {
			chainConfig.BridgingAddresses.BridgingAddress = multiSigAddr.BridgingAddress
			chainConfig.BridgingAddresses.FeeAddress = multiSigAddr.FeeAddress

			logger.Info("successfully updated bridge address", "chainID", chainID)
		}
	}
}

func (appConfig *AppConfig) CreateEnabledChains() []string {
	var enabledChains []string

	appConfig.cardanoChainsMu.RLock()
	for chainID, cfg := range appConfig.CardanoChains {
		if cfg.IsEnabled {
			enabledChains = append(enabledChains, chainID)
		}
	}

	appConfig.cardanoChainsMu.RUnlock()

	for chainID, cfg := range appConfig.EthChains {
		if cfg.IsEnabled {
			enabledChains = append(enabledChains, chainID)
		}
	}

	return enabledChains
}

func (appConfig *AppConfig) GetChainConfig(chainID string) (*CardanoChainConfig, *EthChainConfig) {
	appConfig.cardanoChainsMu.RLock()
	defer appConfig.cardanoChainsMu.RUnlock()

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
		CardanoCliBinary:     cardanowallet.ResolveCardanoCliBinary(config.NetworkID),
		TxProvider:           txProvider,
		MultiSigAddr:         bridgingAddress,
		TestNetMagic:         uint(config.NetworkMagic),
		TTLSlotNumberInc:     config.ChainSpecific.TTLSlotNumberInc,
		MinUtxoValue:         appConfig.BridgingSettings.MinUtxoChainValue[config.ChainID],
		MinBridgingFeeAmount: appConfig.BridgingSettings.MinChainFeeForBridging[config.ChainID],
		PotentialFee:         config.ChainSpecific.PotentialFee,
		ProtocolParameters:   nil,
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
		MinBridgingFeeAmount: feeValue.Uint64(),
	}
}
