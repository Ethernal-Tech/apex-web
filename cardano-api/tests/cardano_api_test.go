package tests

import (
	"context"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"testing"
	"time"

	"github.com/Ethernal-Tech/cardano-api/api"
	"github.com/Ethernal-Tech/cardano-api/api/controllers"
	"github.com/Ethernal-Tech/cardano-api/api/model/request"
	"github.com/Ethernal-Tech/cardano-api/api/model/response"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracommon "github.com/Ethernal-Tech/cardano-infrastructure/common"
	loggerinfra "github.com/Ethernal-Tech/cardano-infrastructure/logger"
	infra "github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/require"
)

//go:embed config/*
var embededConfigFiles embed.FS

func TestCardanoAPI(t *testing.T) {
	t.Skip()
	t.Parallel()

	const serverStartupTimeWait = time.Second

	var (
		config             *core.AppConfig
		ctx                = context.Background()
		privateSigningKeys = []string{
			"a678adbbca14b1fe81e4294f2a5274a25537e164ce839f890ef8f9f29d1e0af2",
			"a7f7a3b37b72924ba926b87e553d587256b92bb14070998491497f9bab22f426",
			"da737464dd5074dfebc34bb90a0cd0e92b06a978a1132d55fda4d2b0df96729c",
			"e16d2bfe1c3aea4c75c314b9067081eaf6c619b5fc5d3b33da155094de05c357",
			"007ac49d3156d99b1f8a23566853a3b0ee0ad01aa90d442e673ff478602450a5",
		}
	)

	logger, err := loggerinfra.NewLogger(loggerinfra.LoggerConfig{
		LogLevel: hclog.Debug,
		Name:     "sevap",
	})
	require.NoError(t, err)

	validatorChangeTracker := core.NewValidatorChangeTracker()

	bytesContent, err := embededConfigFiles.ReadFile("config/config_reactor_testnet.js0n")
	require.NoError(t, err)

	require.NoError(t, json.Unmarshal(bytesContent, &config))
	require.NoError(t, config.FillOut(ctx, logger))

	srcChainConfig := config.CardanoChains["prime"]
	dstChainConfig := config.CardanoChains["vector"]

	apiControllers := []core.APIController{
		controllers.NewCardanoTxController(
			config, logger.Named("cardano_tx_controller"), validatorChangeTracker),
	}

	apiObj, err := api.NewAPI(config.APIConfig, apiControllers, logger.Named("api"))
	require.NoError(t, err)

	go apiObj.Start(ctx)

	// wait for api to start - easiest way (other way is to check some default get endpoint)
	time.Sleep(serverStartupTimeWait)

	t.Cleanup(func() {
		_ = apiObj.Dispose()
	})

	wallets := make([]*infra.Wallet, len(privateSigningKeys))
	keyHashes := make([]string, len(privateSigningKeys))

	for i, psk := range privateSigningKeys {
		pskBytes, err := hex.DecodeString(psk)
		require.NoError(t, err)

		wallets[i] = infra.NewWallet(pskBytes, nil)

		keyHashes[i], err = infra.GetKeyHash(wallets[i].VerificationKey)
		require.NoError(t, err)
	}

	cliBinary := infra.ResolveCardanoCliBinary(srcChainConfig.NetworkID)
	cliUtils := infra.NewCliUtils(cliBinary)

	receiverAddr, err := infra.NewEnterpriseAddress(dstChainConfig.NetworkID, wallets[0].VerificationKey)
	require.NoError(t, err)

	fmt.Printf("receiver addr: %s\n", receiverAddr.String())

	t.Run("basic address", func(t *testing.T) {
		t.Parallel()

		addr, err := infra.NewEnterpriseAddress(srcChainConfig.NetworkID, wallets[0].VerificationKey)
		require.NoError(t, err)

		fmt.Printf("addr: %s\n", addr.String())

		result := createBridgingTx(t, ctx, config, &request.CreateBridgingTxRequest{
			SenderAddr:         addr.String(),
			SourceChainID:      srcChainConfig.ChainID,
			DestinationChainID: dstChainConfig.ChainID,
			Transactions: []request.CreateBridgingTxTransactionRequest{
				{
					Addr:   receiverAddr.String(),
					Amount: config.BridgingSettings.MinValueToBridge + 1,
				},
			},
			BridgingFee: config.BridgingSettings.MinChainFeeForBridging[dstChainConfig.ChainID],
		})

		signAndSubmitTx(
			t, ctx, cliBinary, srcChainConfig.ChainSpecific.OgmiosURL,
			result.TxRaw, []infra.ITxSigner{wallets[0]})

		fmt.Printf("Tx %s has been submitted\n", result.TxHash)

		require.NoError(t, waitForTxBridging(ctx, config, srcChainConfig.ChainID, result.TxHash))
	})

	t.Run("multisig address", func(t *testing.T) {
		t.Parallel()

		quorumCount := (len(keyHashes)*2)/3 + 1
		policyScript := infra.NewPolicyScript(keyHashes[:], quorumCount)

		multisigAddr, err := cliUtils.GetPolicyScriptEnterpriseAddress(uint(srcChainConfig.NetworkMagic), policyScript)
		require.NoError(t, err)

		fmt.Printf("multsig addr: %s\n", multisigAddr)

		result := createBridgingTx(t, ctx, config, &request.CreateBridgingTxRequest{
			SenderAddr:             multisigAddr,
			SenderAddrPolicyScript: policyScript,
			SourceChainID:          srcChainConfig.ChainID,
			DestinationChainID:     dstChainConfig.ChainID,
			Transactions: []request.CreateBridgingTxTransactionRequest{
				{
					Addr:   receiverAddr.String(),
					Amount: config.BridgingSettings.MinValueToBridge + 1,
				},
			},
			BridgingFee: config.BridgingSettings.MinChainFeeForBridging[dstChainConfig.ChainID],
		})

		// chose random n/m wallets
		quorumWallets := make([]infra.ITxSigner, quorumCount)
		for i, v := range rand.Perm(len(wallets))[:quorumCount] {
			quorumWallets[i] = wallets[v]
		}

		signAndSubmitTx(
			t, ctx, cliBinary, srcChainConfig.ChainSpecific.OgmiosURL, result.TxRaw, quorumWallets)

		fmt.Printf("Tx %s has been submitted\n", result.TxHash)

		require.NoError(t, waitForTxBridging(ctx, config, srcChainConfig.ChainID, result.TxHash))
	})
}

func waitForTxBridging(
	ctx context.Context, config *core.AppConfig, chainID, txHash string,
) error {
	type BridgingRequestStateResponse struct {
		Status   string `json:"status"`
		IsRefund bool   `json:"isRefund"`
	}

	currStatus := ""

	_, err := infracommon.ExecuteWithRetry(ctx, func(ctx context.Context) (string, error) {
		url := fmt.Sprintf("%s/api/BridgingRequestState/Get?chainId=%s&txHash=%s",
			config.OracleAPI.URL, chainID, txHash)

		response, err := common.HTTPGet[BridgingRequestStateResponse](ctx, url, config.OracleAPI.APIKey)
		if err != nil {
			return "", infracommon.ErrRetryTryAgain
		}

		if currStatus != response.Status {
			fmt.Printf("TxHash %s changed status to: %s\n", txHash, response.Status)

			currStatus = response.Status
		}

		if response.IsRefund {
			return "", fmt.Errorf("refund: %s", txHash)
		}

		switch response.Status {
		case "FailedToExecuteOnDestination":
			return "", fmt.Errorf("tx failed: %s", response.Status)
		case "ExecutedOnDestination":
			return response.Status, nil
		default:
			return "", infracommon.ErrRetryTryAgain
		}
	}, infracommon.WithRetryCount(60), infracommon.WithRetryWaitTime(time.Second*10))

	return err
}

func signAndSubmitTx(
	t *testing.T, ctx context.Context, cliBinary, ogmiosURL, txRaw string, signers []infra.ITxSigner,
) {
	t.Helper()

	txBuilder, err := infra.NewTxBuilder(cliBinary)
	require.NoError(t, err)

	defer txBuilder.Dispose()

	txRawBytes, err := hex.DecodeString(txRaw)
	require.NoError(t, err)

	witnesses := make([][]byte, len(signers))

	for i, signer := range signers {
		witnesses[i], err = txBuilder.CreateTxWitness(txRawBytes, signer)
		require.NoError(t, err)
	}

	txSigned, err := txBuilder.AssembleTxWitnesses(txRawBytes, witnesses)
	require.NoError(t, err)

	txProvider := infra.NewTxProviderOgmios(ogmiosURL)

	_, err = infracommon.ExecuteWithRetry(ctx,
		func(ctx context.Context) (bool, error) {
			return true, txProvider.SubmitTx(ctx, txSigned)
		}, infracommon.WithRetryCount(10), infracommon.WithRetryWaitTime(time.Second*10))
	require.NoError(t, err)
}

func createBridgingTx(
	t *testing.T, ctx context.Context, config *core.AppConfig, payload *request.CreateBridgingTxRequest,
) *response.BridgingTxResponse {
	t.Helper()

	url := fmt.Sprintf("http://localhost:%d/%s/CardanoTx/CreateBridgingTx",
		config.APIConfig.Port, config.APIConfig.PathPrefix)

	result, err := common.HTTPPost[*request.CreateBridgingTxRequest, *response.BridgingTxResponse](
		ctx, url, payload, config.APIConfig.APIKeys[0])
	require.NoError(t, err)

	return result
}
