package core

import (
	"context"
	"fmt"
	"math/big"
	"strconv"
	"sync"
	"time"

	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	cardanowallet "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	goEthCommon "github.com/ethereum/go-ethereum/common"
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

type EcosystemToken struct {
	ID   uint16 `json:"id"`
	Name string `json:"name"`
}

type DirectionConfigFile struct {
	Directions      map[string]DirectionConfig `json:"directions"`
	EcosystemTokens []EcosystemToken           `json:"ecosystemTokens"`
}

type DirectionConfig struct {
	DestinationChain map[string]TokenPairs `json:"destChain"`
	Tokens           map[uint16]Token      `json:"tokens"`
}

type TokenPairs = []TokenPair

type TokenPair struct {
	SourceTokenID      uint16 `json:"srcTokenID"`
	DestinationTokenID uint16 `json:"dstTokenID"`
}

type Token struct {
	ChainSpecific     string `json:"chainSpecific"`
	LockUnlock        bool   `json:"lockUnlock"`
	IsWrappedCurrency bool   `json:"isWrappedCurrency"`
}

type ReactorBridgingSettings struct {
	// For each chain, the minimum fee required to cover the submission of the currency transaction
	// on the destination chain
	MinChainFeeForBridging map[string]uint64 `json:"minChainFeeForBridging"`
	// For each chain, the minimum allowed UTXO value
	MinUtxoChainValue map[string]uint64 `json:"minUtxoChainValue"`
	// Minimum value allowed to be bridged
	MinValueToBridge uint64 `json:"minValueToBridge"`
	// Maximum amount of currency allowed to be bridged
	MaxAmountAllowedToBridge *big.Int `json:"maxAmountAllowedToBridge" swaggertype:"string"`
	// Maximum number of receivers allowed in a bridging request
	MaxReceiversPerBridgingRequest int `json:"maxReceiversPerBridgingRequest"`
	// Reactor Allowed directions map [src chain] => list of dst chains
	AllowedDirections map[string][]string `json:"allowedDirections"`
} // @name BridgingSettings

type SkylineBridgingSettings struct {
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
	// Minimum amount of colored tokens allowed to be bridged
	MinColCoinsAllowedToBridge uint64 `json:"minColCoinsAllowedToBridge"`
	// Maximum number of receivers allowed in a bridging request
	MaxReceiversPerBridgingRequest int `json:"maxReceiversPerBridgingRequest"`
	// For each chain, the direction config
	DirectionConfig map[string]DirectionConfig `json:"directionConfig"`
	// All defined tokens across the whole ecosystem
	EcosystemTokens []EcosystemToken `json:"ecosystemTokens"`
} // @name BridgingSettings

type AppConfig struct {
	RunMode common.VCRunMode `json:"runMode"`

	cardanoChainsMu         sync.RWMutex
	evmChainsMu             sync.RWMutex
	CardanoChains           map[string]*CardanoChainConfig `json:"cardanoChains"`
	EthChains               map[string]*EthChainConfig     `json:"ethChains"`
	UtxoCacheTimeout        time.Duration                  `json:"utxoCacheTimeout"`
	OracleAPI               OracleAPISettings              `json:"oracleApi"`
	Settings                AppSettings                    `json:"appSettings"`
	ReactorBridgingSettings ReactorBridgingSettings        `json:"-"`
	SkylineBridgingSettings SkylineBridgingSettings        `json:"-"`
	APIConfig               APIConfig                      `json:"api"`
}

func (appConfig *AppConfig) FillOut(ctx context.Context, logger hclog.Logger) error {
	appConfig.cardanoChainsMu.Lock()

	for chainID, cardanoChainConfig := range appConfig.CardanoChains {
		cardanoChainConfig.ChainID = chainID
		cardanoChainConfig.ChainSpecific.NetworkID = cardanoChainConfig.NetworkID
		cardanoChainConfig.ChainSpecific.NetworkMagic = cardanoChainConfig.NetworkMagic
	}

	appConfig.cardanoChainsMu.Unlock()

	appConfig.evmChainsMu.Lock()

	for chainID, ethChainConfig := range appConfig.EthChains {
		ethChainConfig.ChainID = chainID
	}

	appConfig.evmChainsMu.Unlock()

	settingsRequestURL := fmt.Sprintf("%s/api/Settings/Get", appConfig.OracleAPI.URL)

	logger.Debug("fetching settings from oracle API", "url", settingsRequestURL)

	switch appConfig.RunMode {
	case common.ReactorMode:
		return appConfig.fillOutReactorSpecific(ctx, settingsRequestURL, logger)
	case common.SkylineMode:
		return appConfig.fillOutSkylineSpecific(ctx, settingsRequestURL, logger)
	default:
		return fmt.Errorf("unsupported run mode: %v", appConfig.RunMode)
	}
}

func (appConfig *AppConfig) fillOutReactorSpecific(
	ctx context.Context, settingsRequestURL string, logger hclog.Logger,
) error {
	return common.RetryForever(ctx, 5*time.Second, func(ctx context.Context) error {
		settingsResponse, err := common.HTTPGet[*ReactorSettingsResponse](
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

		appConfig.ReactorBridgingSettings = ReactorBridgingSettings{
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

func (appConfig *AppConfig) fillOutSkylineSpecific(
	ctx context.Context, settingsRequestURL string, logger hclog.Logger,
) error {
	err := common.RetryForever(ctx, 5*time.Second, func(ctx context.Context) error {
		settingsResponse, err := common.HTTPGet[*SkylineSettingsResponse](
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

		minColCoinsAllowedToBridge, err := strconv.ParseUint(settingsResponse.MinColCoinsAllowedToBridge, 10, 0)
		if err != nil {
			logger.Error("failed to convert MinColCoinsAllowedToBridge to uint64",
				"MinColCoinsAllowedToBridge", settingsResponse.MinColCoinsAllowedToBridge, "err", err)

			minColCoinsAllowedToBridge = 0
		}

		appConfig.SkylineBridgingSettings = SkylineBridgingSettings{
			MinChainFeeForBridging:         settingsResponse.MinChainFeeForBridging,
			MinChainFeeForBridgingTokens:   settingsResponse.MinChainFeeForBridgingTokens,
			MinOperationFee:                settingsResponse.MinOperationFee,
			MinUtxoChainValue:              settingsResponse.MinUtxoChainValue,
			MinValueToBridge:               settingsResponse.MinValueToBridge,
			MaxAmountAllowedToBridge:       maxAmountAllowedToBridge,
			MaxTokenAmountAllowedToBridge:  maxTokenAmountAllowedToBridge,
			MinColCoinsAllowedToBridge:     minColCoinsAllowedToBridge,
			MaxReceiversPerBridgingRequest: settingsResponse.MaxReceiversPerBridgingRequest,
			DirectionConfig:                settingsResponse.DirectionConfig,
			EcosystemTokens:                settingsResponse.EcosystemTokens,
		}

		logger.Debug("applied settings from oracle API", "settings", settingsResponse)

		return nil
	})

	if err != nil {
		return err
	}

	return appConfig.validateDirectionConfig()
}

func (appConfig *AppConfig) GetChainConfig(chainID string) (*CardanoChainConfig, *EthChainConfig) {
	appConfig.cardanoChainsMu.RLock()

	if cardanoChainConfig, exists := appConfig.CardanoChains[chainID]; exists && cardanoChainConfig.IsEnabled {
		return cardanoChainConfig, nil
	}

	appConfig.cardanoChainsMu.RUnlock()

	appConfig.evmChainsMu.RLock()

	if ethChainConfig, exists := appConfig.EthChains[chainID]; exists && ethChainConfig.IsEnabled {
		return nil, ethChainConfig
	}

	appConfig.evmChainsMu.RUnlock()

	return nil, nil
}

func (appConfig *AppConfig) ToSendTxChainConfigs(useFallback bool) (map[string]sendtx.ChainConfig, error) {
	appConfig.cardanoChainsMu.RLock()

	result := make(map[string]sendtx.ChainConfig, len(appConfig.CardanoChains)+len(appConfig.EthChains))

	for chainID, cardanoConfig := range appConfig.CardanoChains {
		cfg, err := cardanoConfig.ToSendTxChainConfig(appConfig, useFallback)
		if err != nil {
			return nil, err
		}

		result[chainID] = cfg
	}

	appConfig.cardanoChainsMu.RUnlock()

	appConfig.evmChainsMu.RLock()

	for chainID, config := range appConfig.EthChains {
		cfg, err := config.ToSendTxChainConfig(appConfig)
		if err != nil {
			return nil, err
		}

		result[chainID] = cfg
	}

	appConfig.evmChainsMu.RUnlock()

	return result, nil
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

	appConfig.evmChainsMu.RLock()

	for chainID, cfg := range appConfig.EthChains {
		if cfg.IsEnabled {
			enabledChains = append(enabledChains, chainID)
		}
	}

	appConfig.evmChainsMu.RUnlock()

	return enabledChains
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

	var (
		minUtxoValue, defaultMinFeeForBridging,
		minFeeForBridgingTokens, minOperationFeeAmount,
		minColCoinsAllowedToBridge uint64
		tokens map[uint16]sendtx.ApexToken
	)

	switch appConfig.RunMode {
	case common.ReactorMode:
		minUtxoValue = appConfig.ReactorBridgingSettings.MinUtxoChainValue[config.ChainID]
		defaultMinFeeForBridging = appConfig.ReactorBridgingSettings.MinChainFeeForBridging[config.ChainID]
		tokens = map[uint16]sendtx.ApexToken{0: {FullName: cardanowallet.AdaTokenName}}
	case common.SkylineMode:
		minUtxoValue = appConfig.SkylineBridgingSettings.MinUtxoChainValue[config.ChainID]
		defaultMinFeeForBridging = appConfig.SkylineBridgingSettings.MinChainFeeForBridging[config.ChainID]
		minFeeForBridgingTokens = appConfig.SkylineBridgingSettings.MinChainFeeForBridgingTokens[config.ChainID]
		minOperationFeeAmount = appConfig.SkylineBridgingSettings.MinOperationFee[config.ChainID]
		minColCoinsAllowedToBridge = appConfig.SkylineBridgingSettings.MinColCoinsAllowedToBridge

		dirTokens, err := appConfig.SkylineBridgingSettings.GetTokens(config.ChainID)
		if err != nil {
			return sendtx.ChainConfig{}, err
		}

		tokens = make(map[uint16]sendtx.ApexToken, len(dirTokens))
		for tokID, tok := range dirTokens {
			tokens[tokID] = sendtx.ApexToken{
				FullName:          tok.ChainSpecific,
				IsWrappedCurrency: tok.IsWrappedCurrency,
			}
		}
	default:
		return sendtx.ChainConfig{}, fmt.Errorf("run mode not supported: %v", appConfig.RunMode)
	}

	return sendtx.ChainConfig{
		CardanoCliBinary:           cardanowallet.ResolveCardanoCliBinary(config.NetworkID),
		TxProvider:                 txProvider,
		MultiSigAddr:               bridgingAddress,
		TestNetMagic:               uint(config.NetworkMagic),
		TTLSlotNumberInc:           config.ChainSpecific.TTLSlotNumberInc,
		MinUtxoValue:               minUtxoValue,
		DefaultMinFeeForBridging:   defaultMinFeeForBridging,
		MinFeeForBridgingTokens:    minFeeForBridgingTokens,
		MinOperationFeeAmount:      minOperationFeeAmount,
		PotentialFee:               config.ChainSpecific.PotentialFee,
		MinColCoinsAllowedToBridge: minColCoinsAllowedToBridge,
		Tokens:                     tokens,
		ProtocolParameters:         nil,
	}, nil
}

func (config EthChainConfig) ToSendTxChainConfig(
	appConfig *AppConfig,
) (sendtx.ChainConfig, error) {
	var (
		feeValue *big.Int
	)

	switch appConfig.RunMode {
	case common.ReactorMode:
		feeValue = new(big.Int).SetUint64(appConfig.ReactorBridgingSettings.MinChainFeeForBridging[config.ChainID])
	case common.SkylineMode:
		feeValue = new(big.Int).SetUint64(appConfig.SkylineBridgingSettings.MinChainFeeForBridging[config.ChainID])
	default:
		return sendtx.ChainConfig{}, fmt.Errorf("run mode not supported: %v", appConfig.RunMode)
	}

	if len(feeValue.String()) == common.WeiDecimals {
		feeValue = common.WeiToDfm(feeValue)
	}

	return sendtx.ChainConfig{
		DefaultMinFeeForBridging: feeValue.Uint64(),
	}, nil
}

func (settings SkylineBridgingSettings) GetMinBridgingFee(chainID string, isNativeToken bool) (
	fee uint64, found bool,
) {
	if isNativeToken {
		fee, found = settings.MinChainFeeForBridgingTokens[chainID]
	} else {
		fee, found = settings.MinChainFeeForBridging[chainID]
	}

	return fee, found
}

func (settings SkylineBridgingSettings) GetDirConfig(chainID string) (*DirectionConfig, error) {
	dirConfig, ok := settings.DirectionConfig[chainID]
	if !ok {
		return nil, fmt.Errorf("no direction config defined for chain: %s", chainID)
	}

	return &dirConfig, nil
}

func (settings SkylineBridgingSettings) GetCurrencyID(chainID string) (uint16, error) {
	dirConfig, err := settings.GetDirConfig(chainID)
	if err != nil {
		return 0, err
	}

	for id, token := range dirConfig.Tokens {
		if token.ChainSpecific == cardanowallet.AdaTokenName {
			return id, nil
		}
	}

	return 0, fmt.Errorf("no currency token defined for chain: %s", chainID)
}

func (settings SkylineBridgingSettings) GetTokens(chainID string) (map[uint16]Token, error) {
	dirConfig, err := settings.GetDirConfig(chainID)
	if err != nil {
		return nil, err
	}

	return dirConfig.Tokens, nil
}
func (settings SkylineBridgingSettings) GetTokenPair(
	srcChainID, destChainID string,
	srcTokenID uint16,
) (*TokenPair, error) {
	dirConfig, err := settings.GetDirConfig(srcChainID)
	if err != nil {
		return nil, err
	}

	tokenPairs, pathExists := dirConfig.DestinationChain[destChainID]
	if !pathExists {
		return nil, fmt.Errorf("no bridging path from source chain %s to destination chain %s",
			srcChainID, destChainID)
	}

	for _, tokenPair := range tokenPairs {
		if tokenPair.SourceTokenID == srcTokenID {
			return &tokenPair, nil
		}
	}

	return nil, fmt.Errorf("no bridging path from source chain %s to destination chain %s with token ID %d",
		srcChainID, destChainID, srcTokenID)
}

func (appConfig *AppConfig) validateDirectionConfig() error {
	settings := appConfig.SkylineBridgingSettings

	if len(settings.EcosystemTokens) == 0 {
		return fmt.Errorf("no ecosystem tokens")
	}

	ecosystemTokensMap := make(map[uint16]string, len(settings.EcosystemTokens))

	for _, tok := range settings.EcosystemTokens {
		if tok.ID == 0 {
			return fmt.Errorf("found ecosystem token with id zero")
		}

		ecosystemTokensMap[tok.ID] = tok.Name
	}

	allChains := make([]string, 0, len(appConfig.CardanoChains)+len(appConfig.EthChains))
	for _, cc := range appConfig.CardanoChains {
		allChains = append(allChains, cc.ChainID)
	}

	for _, ec := range appConfig.EthChains {
		allChains = append(allChains, ec.ChainID)
	}

	for _, chainID := range allChains {
		dirConfig, ok := settings.DirectionConfig[chainID]
		if !ok {
			return fmt.Errorf("direction config not found for chain: %s", chainID)
		}

		if len(dirConfig.Tokens) == 0 {
			return fmt.Errorf("direction config for chain: %s, has no tokens defined", chainID)
		}

		var foundCurrency bool

		for tokID, tok := range dirConfig.Tokens {
			if tok.ChainSpecific == cardanowallet.AdaTokenName {
				foundCurrency = true
			}

			if _, ok := ecosystemTokensMap[tokID]; !ok {
				return fmt.Errorf("tokenID: %v for chain %s not found in ecosystem tokens", tokID, chainID)
			}
		}

		if !foundCurrency {
			return fmt.Errorf("currency token not found in direction config for chain: %s", chainID)
		}
	}

	for _, cc := range appConfig.CardanoChains {
		dirConfig := settings.DirectionConfig[cc.ChainID]

		for _, tok := range dirConfig.Tokens {
			if tok.ChainSpecific != cardanowallet.AdaTokenName {
				if _, err := cardanowallet.NewTokenWithFullNameTry(tok.ChainSpecific); err != nil {
					return fmt.Errorf("invalid cardano token %s in direction config for chain: %s",
						tok.ChainSpecific, cc.ChainID)
				}
			}
		}
	}

	for _, ec := range appConfig.EthChains {
		dirConfig := settings.DirectionConfig[ec.ChainID]

		for _, tok := range dirConfig.Tokens {
			if tok.ChainSpecific != cardanowallet.AdaTokenName {
				if len(tok.ChainSpecific) == 0 || !goEthCommon.IsHexAddress(tok.ChainSpecific) {
					return fmt.Errorf("invalid eth token contract addr %s in direction config for chain: %s",
						tok.ChainSpecific, ec.ChainID)
				}
			}
		}
	}

	for _, srcChainID := range allChains {
		srcDirConfig := settings.DirectionConfig[srcChainID]

		for dstChainID, tokenPairs := range srcDirConfig.DestinationChain {
			dstDirConfig, ok := settings.DirectionConfig[dstChainID]
			if !ok {
				return fmt.Errorf("direction config not found for chain: %s", dstChainID)
			}

			for _, tokenPair := range tokenPairs {
				if _, ok := ecosystemTokensMap[tokenPair.SourceTokenID]; !ok {
					return fmt.Errorf("tokenPair tokenID: %v not found in ecosystem tokens",
						tokenPair.SourceTokenID)
				}

				if _, ok := ecosystemTokensMap[tokenPair.DestinationTokenID]; !ok {
					return fmt.Errorf("tokenPair tokenID: %v not found in ecosystem tokens",
						tokenPair.DestinationTokenID)
				}

				if _, ok := srcDirConfig.Tokens[tokenPair.SourceTokenID]; !ok {
					return fmt.Errorf(
						"tokenPair tokenID: %v not found in direction config tokens for chain: %s",
						tokenPair.SourceTokenID, srcChainID)
				}

				if _, ok := dstDirConfig.Tokens[tokenPair.DestinationTokenID]; !ok {
					return fmt.Errorf(
						"tokenPair tokenID: %v not found in direction config tokens for chain: %s",
						tokenPair.DestinationTokenID, dstChainID)
				}
			}
		}
	}

	return nil
}
