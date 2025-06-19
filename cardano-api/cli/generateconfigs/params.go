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
	primeNetworkIDFlag               = "prime-network-id"
	primeNetworkMagicFlag            = "prime-network-magic"
	primeBridgingAddressFlag         = "prime-bridging-address"
	primeBridgingFeeAddressFlag      = "prime-bridging-fee-address"
	primeBridgingFallbackAddressFlag = "prime-bridging-fallback-address"
	primeOgmiosURLFlag               = "prime-ogmios-url"
	primeBlockfrostURLFlag           = "prime-blockfrost-url"
	primeBlockfrostAPIKeyFlag        = "prime-blockfrost-api-key"
	primeSocketPathFlag              = "prime-socket-path"
	primeTTLSlotIncFlag              = "prime-ttl-slot-inc"
	primeIsEnabledFlag               = "prime-is-enabled"

	vectorNetworkIDFlag               = "vector-network-id"
	vectorNetworkMagicFlag            = "vector-network-magic"
	vectorBridgingAddressFlag         = "vector-bridging-address"
	vectorBridgingFeeAddressFlag      = "vector-bridging-fee-address"
	vectorBridgingFallbackAddressFlag = "vector-bridging-fallback-address"
	vectorOgmiosURLFlag               = "vector-ogmios-url"
	vectorBlockfrostURLFlag           = "vector-blockfrost-url"
	vectorBlockfrostAPIKeyFlag        = "vector-blockfrost-api-key"
	vectorSocketPathFlag              = "vector-socket-path"
	vectorTTLSlotIncFlag              = "vector-ttl-slot-inc"
	vectorIsEnabledFlag               = "vector-is-enabled"

	nexusIsEnabledFlag = "nexus-is-enabled"

	logsPathFlag = "logs-path"

	utxoCacheTimeoutFlag = "utxo-cache-timeout"
	utxoCacheKeysFlag    = "utxo-cache-keys"

	oracleAPIURLFlag = "oracle-api-url"
	oracleAPIKeyFlag = "oracle-api-key"

	apiPortFlag = "api-port"
	apiKeysFlag = "api-keys"

	outputDirFlag      = "output-dir"
	outputFileNameFlag = "output-file-name"

	primeNetworkIDFlagDesc               = "prime network id"
	primeNetworkMagicFlagDesc            = "prime network magic (default 0)"
	primeBridgingAddressFlagDesc         = "prime bridging address"
	primeBridgingFeeAddressFlagDesc      = "prime bridging feeaddress"
	primeBridgingFallbackAddressFlagDesc = "prime bridging fallback address"
	primeOgmiosURLFlagDesc               = "ogmios URL for prime network"
	primeBlockfrostURLFlagDesc           = "blockfrost URL for prime network"
	primeBlockfrostAPIKeyFlagDesc        = "blockfrost API key for prime network" //nolint:gosec
	primeSocketPathFlagDesc              = "socket path for prime network"
	primeTTLSlotIncFlagDesc              = "TTL slot increment for prime"
	primeIsEnabledFlagDesc               = "chain enable flag for prime"

	vectorNetworkIDFlagDesc               = "vector network id"
	vectorNetworkMagicFlagDesc            = "vector network magic (default 0)"
	vectorBridgingAddressFlagDesc         = "vector bridging address"
	vectorBridgingFeeAddressFlagDesc      = "vector bridging fee address"
	vectorBridgingFallbackAddressFlagDesc = "vector bridging fallback address"
	vectorOgmiosURLFlagDesc               = "ogmios URL for vector network"
	vectorBlockfrostURLFlagDesc           = "blockfrost URL for vector network"
	vectorBlockfrostAPIKeyFlagDesc        = "blockfrost API key for vector network" //nolint:gosec
	vectorSocketPathFlagDesc              = "socket path for vector network"
	vectorTTLSlotIncFlagDesc              = "TTL slot increment for vector"
	vectorIsEnabledFlagDesc               = "chain enable flag for vector"

	nexusIsEnabledFlagDesc = "chain enable flag for nexus"

	logsPathFlagDesc = "path to where logs will be stored"

	utxoCacheTimeoutFlagDec = "for how long should a UTXO be reserved in the cache"
	utxoCacheKeysFlagDesc   = "list of keys for UTXO cache functionality"

	oracleAPIURLFlagDesc = "(mandatory) URL of Oracle API"
	oracleAPIKeyFlagDesc = "(mandatory) API Key of Oracle API" //nolint:gosec

	apiPortFlagDesc = "port at which API should run"
	apiKeysFlagDesc = "(mandatory) list of keys for API access"

	outputDirFlagDesc      = "path to config jsons output directory"
	outputFileNameFlagDesc = "config json output file name"

	defaultPrimeBlockConfirmationCount  = 10
	defaultVectorBlockConfirmationCount = 10
	defaultNetworkMagic                 = 0
	defaultLogsPath                     = "./logs"
	defaultUtxoCacheTimeout             = time.Second * 90
	defaultAPIPort                      = 10000
	defaultOutputDir                    = "./"
	defaultOutputFileName               = "config.json"
	defaultPrimeTTLSlotNumberInc        = 1800 + defaultPrimeBlockConfirmationCount*10  // BlockTimeSeconds
	defaultVectorTTLSlotNumberInc       = 1800 + defaultVectorBlockConfirmationCount*10 // BlockTimeSeconds
	defaultIsEnabled                    = true

	defaultUseDemeter = true
)

type generateConfigsParams struct {
	primeNetworkID               uint32
	primeNetworkMagic            uint32
	primeBridgingAddress         string
	primeBridgingFeeAddress      string
	primeBridgingFallbackAddress string
	primeOgmiosURL               string
	primeBlockfrostURL           string
	primeBlockfrostAPIKey        string
	primeSocketPath              string
	primeTTLSlotInc              uint64
	primeIsEnabled               bool

	vectorNetworkID               uint32
	vectorNetworkMagic            uint32
	vectorBridgingAddress         string
	vectorBridgingFeeAddress      string
	vectorBridgingFallbackAddress string
	vectorOgmiosURL               string
	vectorBlockfrostURL           string
	vectorBlockfrostAPIKey        string
	vectorSocketPath              string
	vectorTTLSlotInc              uint64
	vectorIsEnabled               bool

	nexusIsEnabled bool

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

func validateAddress(isRequired bool, address string, flag string, networkID wallet.CardanoNetworkType) error {
	if address == "" {
		if !isRequired {
			return nil
		}

		return fmt.Errorf("specify: %s", flag)
	}

	addr, err := wallet.NewCardanoAddressFromString(address)
	if err != nil || addr.String() != address || addr.GetInfo().Network != networkID {
		return fmt.Errorf("invalid: %s", flag)
	}

	return nil
}

func (p *generateConfigsParams) validateFlags() error {
	err := validateAddress(
		true, p.primeBridgingAddress, primeBridgingAddressFlag,
		wallet.CardanoNetworkType(p.primeNetworkID))
	if err != nil {
		return err
	}

	err = validateAddress(
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
		true, p.vectorBridgingAddress, vectorBridgingAddressFlag,
		wallet.CardanoNetworkType(p.vectorNetworkID))
	if err != nil {
		return err
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

	if p.vectorBlockfrostURL != "" && !common.IsValidHTTPURL(p.vectorBlockfrostURL) {
		return fmt.Errorf("invalid vector blockfrost url: %s", p.vectorBlockfrostURL)
	}

	if p.vectorOgmiosURL != "" && !common.IsValidHTTPURL(p.vectorOgmiosURL) {
		return fmt.Errorf("invalid vector ogmios url: %s", p.vectorOgmiosURL)
	}

	if p.vectorBlockfrostURL == "" && p.vectorSocketPath == "" && p.vectorOgmiosURL == "" {
		return fmt.Errorf("specify at least one of: %s, %s, %s",
			vectorBlockfrostURLFlag, vectorSocketPathFlag, vectorOgmiosURLFlag)
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

func (p *generateConfigsParams) setFlags(cmd *cobra.Command) {
	cmd.Flags().Uint32Var(
		&p.primeNetworkID,
		primeNetworkIDFlag,
		uint32(wallet.MainNetNetwork),
		primeNetworkIDFlagDesc,
	)
	cmd.Flags().Uint32Var(
		&p.primeNetworkMagic,
		primeNetworkMagicFlag,
		defaultNetworkMagic,
		primeNetworkMagicFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.primeBridgingAddress,
		primeBridgingAddressFlag,
		"",
		primeBridgingAddressFlagDesc,
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

	cmd.Flags().BoolVar(
		&p.primeIsEnabled,
		primeIsEnabledFlag,
		defaultIsEnabled,
		primeIsEnabledFlagDesc,
	)

	cmd.Flags().Uint32Var(
		&p.vectorNetworkID,
		vectorNetworkIDFlag,
		uint32(wallet.VectorMainNetNetwork),
		vectorNetworkIDFlagDesc,
	)
	cmd.Flags().Uint32Var(
		&p.vectorNetworkMagic,
		vectorNetworkMagicFlag,
		defaultNetworkMagic,
		vectorNetworkMagicFlagDesc,
	)
	cmd.Flags().StringVar(
		&p.vectorBridgingAddress,
		vectorBridgingAddressFlag,
		"",
		vectorBridgingAddressFlagDesc,
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

	cmd.Flags().BoolVar(
		&p.vectorIsEnabled,
		vectorIsEnabledFlag,
		defaultIsEnabled,
		vectorIsEnabledFlagDesc,
	)

	cmd.Flags().BoolVar(
		&p.nexusIsEnabled,
		nexusIsEnabledFlag,
		defaultIsEnabled,
		nexusIsEnabledFlagDesc,
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
	cmd.Flags().StringArrayVar(
		&p.apiKeys,
		apiKeysFlag,
		nil,
		apiKeysFlagDesc,
	)

	cmd.MarkFlagsMutuallyExclusive(primeBlockfrostAPIKeyFlag, primeSocketPathFlag, primeOgmiosURLFlag)
	cmd.MarkFlagsMutuallyExclusive(vectorBlockfrostURLFlag, vectorSocketPathFlag, vectorOgmiosURLFlag)
}

func (p *generateConfigsParams) Execute() (common.ICommandResult, error) {
	config := &core.AppConfig{
		CardanoChains: map[string]*core.CardanoChainConfig{
			common.ChainIDStrPrime: {
				NetworkID:    wallet.CardanoNetworkType(p.primeNetworkID),
				NetworkMagic: p.primeNetworkMagic,
				BridgingAddresses: core.BridgingAddresses{
					BridgingAddress: p.primeBridgingAddress,
					FeeAddress:      p.primeBridgingFeeAddress,
					FallbackAddress: p.primeBridgingFallbackAddress,
				},
				ChainSpecific: &cardanotx.CardanoChainConfig{
					OgmiosURL:        p.primeOgmiosURL,
					BlockfrostURL:    p.primeBlockfrostURL,
					BlockfrostAPIKey: p.primeBlockfrostAPIKey,
					UseDemeter:       defaultUseDemeter,
					SocketPath:       p.primeSocketPath,
					PotentialFee:     500000,
					TTLSlotNumberInc: p.primeTTLSlotInc,
				},
				IsEnabled: p.primeIsEnabled,
			},
			common.ChainIDStrVector: {
				NetworkID:    wallet.CardanoNetworkType(p.vectorNetworkID),
				NetworkMagic: p.vectorNetworkMagic,
				BridgingAddresses: core.BridgingAddresses{
					BridgingAddress: p.vectorBridgingAddress,
					FeeAddress:      p.vectorBridgingFeeAddress,
					FallbackAddress: p.vectorBridgingFallbackAddress,
				},
				ChainSpecific: &cardanotx.CardanoChainConfig{
					OgmiosURL:        p.vectorOgmiosURL,
					BlockfrostURL:    p.vectorBlockfrostURL,
					BlockfrostAPIKey: p.vectorBlockfrostAPIKey,
					SocketPath:       p.vectorSocketPath,
					PotentialFee:     500000,
					TTLSlotNumberInc: p.vectorTTLSlotInc,
				},
				IsEnabled: p.vectorIsEnabled,
			},
		},
		EthChains: map[string]*core.EthChainConfig{
			common.ChainIDStrNexus: {
				IsEnabled: p.nexusIsEnabled,
			},
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
