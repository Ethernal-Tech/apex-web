package cligenerateconfigs

import (
	"fmt"
	"path"
	"time"

	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/logger"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
	"github.com/spf13/cobra"
)

const (
	cardanoNetworkIDFlag               = "cardano-network-id"
	cardanoNetworkMagicFlag            = "cardano-network-magic"
	cardanoBridgingFeeAddressFlag      = "cardano-bridging-fee-address"
	cardanoBridgingFallbackAddressFlag = "cardano-bridging-fallback-address"
	cardanoOgmiosURLFlag               = "cardano-ogmios-url"
	cardanoBlockfrostURLFlag           = "cardano-blockfrost-url"
	cardanoBlockfrostAPIKeyFlag        = "cardano-blockfrost-api-key" //nolint:gosec
	cardanoSocketPathFlag              = "cardano-socket-path"
	cardanoTTLSlotIncFlag              = "cardano-ttl-slot-inc"

	cardanoNetworkIDFlagDesc               = "cardano network id"
	cardanoNetworkMagicFlagDesc            = "cardano network magic (default 0)"
	cardanoBridgingFeeAddressFlagDesc      = "cardano bridging fee address"
	cardanoBridgingFallbackAddressFlagDesc = "cardano bridging fallback address"
	cardanoOgmiosURLFlagDesc               = "ogmios URL for cardano network"
	cardanoBlockfrostURLFlagDesc           = "blockfrost URL for cardano network"
	cardanoBlockfrostAPIKeyFlagDesc        = "blockfrost API key for cardano network" //nolint:gosec
	cardanoSocketPathFlagDesc              = "socket path for cardano network"
	cardanoTTLSlotIncFlagDesc              = "TTL slot increment for cardano"

	defaultCardanoBlockConfirmationCount = 10
	defaultCardanoTTLSlotNumberInc       = 1800 + defaultCardanoBlockConfirmationCount*10 // BlockTimeSeconds
)

type skylineGenerateConfigsParams struct {
	primeNetworkID               uint32
	primeNetworkMagic            uint32
	primeBridgingFeeAddress      string
	primeBridgingFallbackAddress string
	primeOgmiosURL               string
	primeBlockfrostURL           string
	primeBlockfrostAPIKey        string
	primeSocketPath              string
	primeTTLSlotInc              uint64

	cardanoNetworkID               uint32
	cardanoNetworkMagic            uint32
	cardanoBridgingFeeAddress      string
	cardanoBridgingFallbackAddress string
	cardanoOgmiosURL               string
	cardanoBlockfrostURL           string
	cardanoBlockfrostAPIKey        string
	cardanoSocketPath              string
	cardanoTTLSlotInc              uint64

	vectorNetworkID               uint32
	vectorNetworkMagic            uint32
	vectorBridgingFeeAddress      string
	vectorBridgingFallbackAddress string
	vectorOgmiosURL               string
	vectorBlockfrostURL           string
	vectorBlockfrostAPIKey        string
	vectorSocketPath              string
	vectorTTLSlotInc              uint64

	logsPath         string
	utxoCacheTimeout time.Duration
	utxoCacheKeys    []string

	oracleAPIURL string
	oracleAPIKey string

	apiPort uint32
	apiKeys []string

	outputDir      string
	outputFileName string
}

func (p *skylineGenerateConfigsParams) validateFlags() error {
	err := validateAddress(
		true, p.primeBridgingFeeAddress, primeBridgingFeeAddressFlag,
		wallet.CardanoNetworkType(p.primeNetworkID))
	if err != nil {
		return err
	}

	err = validateAddress(
		false, p.primeBridgingFallbackAddress, primeBridgingFallbackAddressFlag,
		wallet.CardanoNetworkType(p.primeNetworkID))
	if err != nil {
		return err
	}

	if p.primeBlockfrostURL == "" && p.primeSocketPath == "" && p.primeOgmiosURL == "" {
		return fmt.Errorf("specify at least one of: %s, %s, %s",
			primeBlockfrostURLFlag, primeSocketPathFlag, primeOgmiosURLFlag)
	}

	if p.primeBlockfrostURL != "" && !common.IsValidHTTPURL(p.primeBlockfrostURL) {
		return fmt.Errorf("invalid prime blockfrost url: %s", p.primeBlockfrostURL)
	}

	if p.primeOgmiosURL != "" && !common.IsValidHTTPURL(p.primeOgmiosURL) {
		return fmt.Errorf("invalid prime ogmios url: %s", p.primeOgmiosURL)
	}

	err = validateAddress(
		true, p.cardanoBridgingFeeAddress, cardanoBridgingFeeAddressFlag,
		wallet.CardanoNetworkType(p.cardanoNetworkID))
	if err != nil {
		return err
	}

	err = validateAddress(
		false, p.cardanoBridgingFallbackAddress, cardanoBridgingFallbackAddressFlag,
		wallet.CardanoNetworkType(p.cardanoNetworkID))
	if err != nil {
		return err
	}

	if p.cardanoBlockfrostURL == "" && p.cardanoSocketPath == "" && p.cardanoOgmiosURL == "" {
		return fmt.Errorf("specify at least one of: %s, %s, %s",
			cardanoBlockfrostURLFlag, cardanoSocketPathFlag, cardanoOgmiosURLFlag)
	}

	if p.cardanoBlockfrostURL != "" && !common.IsValidHTTPURL(p.cardanoBlockfrostURL) {
		return fmt.Errorf("invalid cardano blockfrost url: %s", p.cardanoBlockfrostURL)
	}

	if p.cardanoOgmiosURL != "" && !common.IsValidHTTPURL(p.cardanoOgmiosURL) {
		return fmt.Errorf("invalid cardano ogmios url: %s", p.cardanoOgmiosURL)
	}

	err = validateAddress(
		true, p.vectorBridgingFeeAddress, vectorBridgingFeeAddressFlag,
		wallet.CardanoNetworkType(p.vectorNetworkID))
	if err != nil {
		return err
	}

	err = validateAddress(
		false, p.vectorBridgingFallbackAddress, vectorBridgingFallbackAddressFlag,
		wallet.CardanoNetworkType(p.vectorNetworkID))
	if err != nil {
		return err
	}

	if p.vectorBlockfrostURL == "" && p.vectorSocketPath == "" && p.vectorOgmiosURL == "" {
		return fmt.Errorf("specify at least one of: %s, %s, %s",
			vectorBlockfrostURLFlag, vectorSocketPathFlag, vectorOgmiosURLFlag)
	}

	if p.vectorBlockfrostURL != "" && !common.IsValidHTTPURL(p.vectorBlockfrostURL) {
		return fmt.Errorf("invalid vector blockfrost url: %s", p.vectorBlockfrostURL)
	}

	if p.vectorOgmiosURL != "" && !common.IsValidHTTPURL(p.vectorOgmiosURL) {
		return fmt.Errorf("invalid vector ogmios url: %s", p.vectorOgmiosURL)
	}

	if !common.IsValidHTTPURL(p.oracleAPIURL) {
		return fmt.Errorf("invalid oracle API url: %s", p.oracleAPIURL)
	}

	if p.oracleAPIKey == "" {
		return fmt.Errorf("missing %s", oracleAPIKeyFlag)
	}

	if len(p.apiKeys) == 0 {
		return fmt.Errorf("specify at least one %s", apiKeysFlag)
	}

	return nil
}

func (p *skylineGenerateConfigsParams) setFlags(cmd *cobra.Command) {
	cmd.Flags().Uint32Var(
		&p.primeNetworkID,
		primeNetworkIDFlag,
		uint32(wallet.MainNetNetwork),
		primeNetworkIDFlagDesc,
	)
	cmd.Flags().Uint32Var(
		&p.primeNetworkMagic,
		primeNetworkMagicFlag,
		uint32(wallet.MainNetProtocolMagic),
		primeNetworkMagicFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeBridgingFeeAddress,
		primeBridgingFeeAddressFlag,
		"",
		primeBridgingFeeAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeBridgingFallbackAddress,
		primeBridgingFallbackAddressFlag,
		"",
		primeBridgingFallbackAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeOgmiosURL,
		primeOgmiosURLFlag,
		"",
		primeOgmiosURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeBlockfrostURL,
		primeBlockfrostURLFlag,
		"",
		primeBlockfrostURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeBlockfrostAPIKey,
		primeBlockfrostAPIKeyFlag,
		"",
		primeBlockfrostAPIKeyFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeSocketPath,
		primeSocketPathFlag,
		"",
		primeSocketPathFlagDesc,
	)
	cmd.Flags().Uint64Var(
		&p.primeTTLSlotInc,
		primeTTLSlotIncFlag,
		defaultPrimeTTLSlotNumberInc,
		primeTTLSlotIncFlagDesc,
	)

	cmd.Flags().Uint32Var(
		&p.cardanoNetworkID,
		cardanoNetworkIDFlag,
		uint32(wallet.MainNetNetwork),
		cardanoNetworkIDFlagDesc,
	)
	cmd.Flags().Uint32Var(
		&p.cardanoNetworkMagic,
		cardanoNetworkMagicFlag,
		defaultNetworkMagic,
		cardanoNetworkMagicFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoBridgingFeeAddress,
		cardanoBridgingFeeAddressFlag,
		"",
		cardanoBridgingFeeAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoBridgingFallbackAddress,
		cardanoBridgingFallbackAddressFlag,
		"",
		cardanoBridgingFallbackAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoOgmiosURL,
		cardanoOgmiosURLFlag,
		"",
		cardanoOgmiosURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoBlockfrostURL,
		cardanoBlockfrostURLFlag,
		"",
		cardanoBlockfrostURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoBlockfrostAPIKey,
		cardanoBlockfrostAPIKeyFlag,
		"",
		cardanoBlockfrostAPIKeyFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.cardanoSocketPath,
		cardanoSocketPathFlag,
		"",
		cardanoSocketPathFlagDesc,
	)
	cmd.Flags().Uint64Var(
		&p.cardanoTTLSlotInc,
		cardanoTTLSlotIncFlag,
		defaultCardanoTTLSlotNumberInc,
		cardanoTTLSlotIncFlagDesc,
	)

	cmd.Flags().Uint32Var(
		&p.vectorNetworkID,
		vectorNetworkIDFlag,
		uint32(wallet.MainNetNetwork),
		vectorNetworkIDFlagDesc,
	)
	cmd.Flags().Uint32Var(
		&p.vectorNetworkMagic,
		vectorNetworkMagicFlag,
		defaultNetworkMagic,
		vectorNetworkMagicFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorBridgingFeeAddress,
		vectorBridgingFeeAddressFlag,
		"",
		vectorBridgingFeeAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorBridgingFallbackAddress,
		vectorBridgingFallbackAddressFlag,
		"",
		vectorBridgingFallbackAddressFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorOgmiosURL,
		vectorOgmiosURLFlag,
		"",
		vectorOgmiosURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorBlockfrostURL,
		vectorBlockfrostURLFlag,
		"",
		vectorBlockfrostURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorBlockfrostAPIKey,
		vectorBlockfrostAPIKeyFlag,
		"",
		vectorBlockfrostAPIKeyFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorSocketPath,
		vectorSocketPathFlag,
		"",
		vectorSocketPathFlagDesc,
	)
	cmd.Flags().Uint64Var(
		&p.vectorTTLSlotInc,
		vectorTTLSlotIncFlag,
		defaultVectorTTLSlotNumberInc,
		vectorTTLSlotIncFlagDesc,
	)

	cmd.Flags().StringVar(
		&p.logsPath,
		logsPathFlag,
		defaultLogsPath,
		logsPathFlagDesc,
	)
	cmd.Flags().DurationVar(
		&p.utxoCacheTimeout,
		utxoCacheTimeoutFlag,
		defaultUtxoCacheTimeout,
		utxoCacheTimeoutFlagDec,
	)
	cmd.Flags().StringArrayVar(
		&p.utxoCacheKeys,
		utxoCacheKeysFlag,
		nil,
		utxoCacheKeysFlagDesc,
	)

	cmd.Flags().StringVar(
		&p.oracleAPIURL,
		oracleAPIURLFlag,
		"",
		oracleAPIURLFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.oracleAPIKey,
		oracleAPIKeyFlag,
		"",
		oracleAPIKeyFlagDesc,
	)

	cmd.Flags().Uint32Var(
		&p.apiPort,
		apiPortFlag,
		defaultAPIPort,
		apiPortFlagDesc,
	)
	cmd.Flags().StringArrayVar(
		&p.apiKeys,
		apiKeysFlag,
		nil,
		apiKeysFlagDesc,
	)

	cmd.Flags().StringVar(
		&p.outputDir,
		outputDirFlag,
		defaultOutputDir,
		outputDirFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.outputFileName,
		outputFileNameFlag,
		defaultOutputFileName,
		outputFileNameFlagDesc,
	)

	cmd.MarkFlagsMutuallyExclusive(primeBlockfrostAPIKeyFlag, primeSocketPathFlag, primeOgmiosURLFlag)
	cmd.MarkFlagsMutuallyExclusive(cardanoBlockfrostURLFlag, cardanoSocketPathFlag, cardanoOgmiosURLFlag)
	cmd.MarkFlagsMutuallyExclusive(vectorBlockfrostURLFlag, vectorSocketPathFlag, vectorOgmiosURLFlag)
}

func (p *skylineGenerateConfigsParams) Execute(
	_ common.OutputFormatter,
) (common.ICommandResult, error) {
	config := &core.AppConfig{
		RunMode: common.SkylineMode,
		CardanoChains: map[string]*core.CardanoChainConfig{
			common.ChainIDStrPrime: {
				NetworkID:    wallet.CardanoNetworkType(p.primeNetworkID),
				NetworkMagic: p.primeNetworkMagic,
				BridgingAddresses: core.BridgingAddresses{
					FeeAddress:      p.primeBridgingFeeAddress,
					FallbackAddress: p.primeBridgingFallbackAddress,
				},
				ChainSpecific: &cardanotx.CardanoChainConfig{
					OgmiosURL:        p.primeOgmiosURL,
					BlockfrostURL:    p.primeBlockfrostURL,
					BlockfrostAPIKey: p.primeBlockfrostAPIKey,
					SocketPath:       p.primeSocketPath,
					PotentialFee:     500000,
					TTLSlotNumberInc: p.primeTTLSlotInc,
				},
				IsEnabled: true,
			},
			common.ChainIDStrCardano: {
				NetworkID:    wallet.CardanoNetworkType(p.cardanoNetworkID),
				NetworkMagic: p.cardanoNetworkMagic,
				BridgingAddresses: core.BridgingAddresses{
					FeeAddress:      p.cardanoBridgingFeeAddress,
					FallbackAddress: p.cardanoBridgingFallbackAddress,
				},
				ChainSpecific: &cardanotx.CardanoChainConfig{
					OgmiosURL:        p.cardanoOgmiosURL,
					BlockfrostURL:    p.cardanoBlockfrostURL,
					BlockfrostAPIKey: p.cardanoBlockfrostAPIKey,
					UseDemeter:       defaultUseDemeter,
					SocketPath:       p.cardanoSocketPath,
					PotentialFee:     500000,
					TTLSlotNumberInc: p.cardanoTTLSlotInc,
				},
				IsEnabled: true,
			},
			common.ChainIDStrVector: {
				NetworkID:    wallet.CardanoNetworkType(p.vectorNetworkID),
				NetworkMagic: p.vectorNetworkMagic,
				BridgingAddresses: core.BridgingAddresses{
					FeeAddress:      p.vectorBridgingFeeAddress,
					FallbackAddress: p.vectorBridgingFallbackAddress,
				},
				ChainSpecific: &cardanotx.CardanoChainConfig{
					OgmiosURL:        p.vectorOgmiosURL,
					BlockfrostURL:    p.vectorBlockfrostURL,
					BlockfrostAPIKey: p.vectorBlockfrostAPIKey,
					UseDemeter:       defaultUseDemeter,
					SocketPath:       p.vectorSocketPath,
					PotentialFee:     500000,
					TTLSlotNumberInc: p.vectorTTLSlotInc,
				},
				IsEnabled: true,
			},
		},
		EthChains: map[string]*core.EthChainConfig{
			common.ChainIDStrNexus: {},
		},
		UtxoCacheTimeout: p.utxoCacheTimeout,
		OracleAPI: core.OracleAPISettings{
			URL:    p.oracleAPIURL,
			APIKey: p.oracleAPIKey,
		},
		Settings: core.AppSettings{
			Logger: logger.LoggerConfig{
				LogFilePath:         path.Join(p.logsPath, "cardano-api.log"),
				LogLevel:            hclog.Debug,
				JSONLogFormat:       false,
				AppendFile:          true,
				RotatingLogsEnabled: false,
				RotatingLogerConfig: logger.RotatingLoggerConfig{
					MaxSizeInMB:  100,
					MaxBackups:   30,
					MaxAgeInDays: 30,
					Compress:     false,
				},
			},
		},
		APIConfig: core.APIConfig{
			Port:       p.apiPort,
			PathPrefix: "api",
			AllowedHeaders: []string{
				"Content-Type",
			},
			AllowedOrigins: []string{
				"*",
			},
			AllowedMethods: []string{
				"GET",
				"HEAD",
				"POST",
				"PUT",
				"OPTIONS",
				"DELETE",
			},
			APIKeyHeader:  "x-api-key",
			APIKeys:       p.apiKeys,
			UTXOCacheKeys: p.utxoCacheKeys,
		},
	}

	outputDirPath := path.Clean(p.outputDir)
	if err := common.CreateDirectoryIfNotExists(outputDirPath, 0770); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	configPath := path.Join(outputDirPath, p.outputFileName)
	if err := common.SaveJSON(configPath, config, true); err != nil {
		return nil, fmt.Errorf("failed to create config json: %w", err)
	}

	return &CmdResult{
		configPath: configPath,
	}, nil
}
