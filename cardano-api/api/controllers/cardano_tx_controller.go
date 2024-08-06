package controllers

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"

	"github.com/Ethernal-Tech/cardano-api/api/model/request"
	"github.com/Ethernal-Tech/cardano-api/api/model/response"
	"github.com/Ethernal-Tech/cardano-api/api/utils"
	cardanotx "github.com/Ethernal-Tech/cardano-api/cardano"
	"github.com/Ethernal-Tech/cardano-api/common"
	"github.com/Ethernal-Tech/cardano-api/core"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	goEthCommon "github.com/ethereum/go-ethereum/common"
	"github.com/hashicorp/go-hclog"
)

type CardanoTxControllerImpl struct {
	appConfig *core.AppConfig
	logger    hclog.Logger
}

var _ core.APIController = (*CardanoTxControllerImpl)(nil)

func NewCardanoTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *CardanoTxControllerImpl {
	return &CardanoTxControllerImpl{
		appConfig: appConfig,
		logger:    logger,
	}
}

func (*CardanoTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *CardanoTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx, APIKeyAuth: true},
		{Path: "SignBridgingTx", Method: http.MethodPost, Handler: c.signBridgingTx, APIKeyAuth: true},
		{Path: "GetBalance", Method: http.MethodGet, Handler: c.getBalance, APIKeyAuth: true},
	}
}

func (c *CardanoTxControllerImpl) getBalance(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getBalance called", "url", r.URL)

	queryValues := r.URL.Query()
	c.logger.Debug("getBalance request", "query values", queryValues, "url", r.URL)

	chainIDArr, exists := queryValues["chainId"]
	if !exists || len(chainIDArr) == 0 {
		c.logger.Debug("getBalance request", "err", "chainId missing from query", "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "chainId missing from query")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	addressArr, exists := queryValues["address"]
	if !exists || len(addressArr) == 0 {
		c.logger.Debug("getBalance request", "err", "address missing from query", "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "address missing from query")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	chainID := chainIDArr[0]
	address := addressArr[0]

	chainConfig, exists := c.appConfig.CardanoChains[chainID]
	if !exists {
		c.logger.Debug("getBalance request", "err", "chainID not registered", "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "chainID not registered")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	txProvider, err := chainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		c.logger.Debug("getBalance request", "err", "failed to create tx provider", "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "failed to create tx provider")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	utxos, err := txProvider.GetUtxos(context.Background(), address)
	if err != nil {
		c.logger.Debug("getBalance request", "err", "failed to get utxos", "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "failed to get utxos")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	balance := big.NewInt(0)

	for _, utxo := range utxos {
		balance.Add(balance, new(big.Int).SetUint64(utxo.Amount))
	}

	c.logger.Debug("getBalance success", "url", r.URL)

	w.Header().Set("Content-Type", "application/json")

	err = json.NewEncoder(w).Encode(response.NewBalanceResponse(balance))
	if err != nil {
		c.logger.Error("error while writing response", "err", err)
	}
}

func (c *CardanoTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("createBridgingTx called", "url", r.URL)

	var requestBody request.CreateBridgingTxRequest

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		c.logger.Debug("createBridgingTx request", "err", err.Error(), "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	c.logger.Debug("createBridgingTx request", "body", requestBody, "url", r.URL)

	err = c.validateAndFillOutCreateBridgingTxRequest(&requestBody)
	if err != nil {
		c.logger.Debug("createBridgingTx request", "err", err.Error(), "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	txRaw, txHash, txFee, err := c.createTx(requestBody)
	if err != nil {
		c.logger.Debug("createBridgingTx request", "err", err.Error(), "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	c.logger.Debug("createBridgingTx success", "url", r.URL)

	w.Header().Set("Content-Type", "application/json")

	err = json.NewEncoder(w).Encode(response.NewFullBridgingTxResponse(txRaw, txHash, txFee, requestBody.BridgingFee))
	if err != nil {
		c.logger.Error("error while writing response", "err", err)
	}
}

func (c *CardanoTxControllerImpl) signBridgingTx(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("signBridgingTx called", "url", r.URL)

	var requestBody request.SignBridgingTxRequest

	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		c.logger.Debug("signBridgingTx request", "err", err.Error(), "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	if requestBody.TxRaw == "" || requestBody.SigningKeyHex == "" || requestBody.TxHash == "" {
		c.logger.Debug("signBridgingTx request", "txRaw", requestBody.TxRaw,
			"signingKeyHex", requestBody.SigningKeyHex, "txHash", requestBody.TxHash)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, "invalid input data")
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	c.logger.Debug("signBridgingTx request", "body", requestBody, "url", r.URL)

	signedTx, err := c.signTx(requestBody)
	if err != nil {
		c.logger.Debug("signBridgingTx request", "err", err.Error(), "url", r.URL)

		rerr := utils.WriteErrorResponse(w, http.StatusBadRequest, err.Error())
		if rerr != nil {
			c.logger.Error("error while WriteErrorResponse", "err", rerr)
		}

		return
	}

	c.logger.Debug("signBridgingTx success", "url", r.URL)

	w.Header().Set("Content-Type", "application/json")

	err = json.NewEncoder(w).Encode(response.NewBridgingTxResponse(signedTx, requestBody.TxHash))
	if err != nil {
		c.logger.Error("error while writing response", "err", err)
	}
}

func (c *CardanoTxControllerImpl) validateAndFillOutCreateBridgingTxRequest(
	requestBody *request.CreateBridgingTxRequest,
) error {
	cardanoSrcConfig, _ := core.GetChainConfig(c.appConfig, requestBody.SourceChainID)
	if cardanoSrcConfig == nil {
		return fmt.Errorf("origin chain not registered: %v", requestBody.SourceChainID)
	}

	cardanoDestConfig, ethDestConfig := core.GetChainConfig(c.appConfig, requestBody.DestinationChainID)
	if cardanoDestConfig == nil && ethDestConfig == nil {
		return fmt.Errorf("destination chain not registered: %v", requestBody.DestinationChainID)
	}

	if len(requestBody.Transactions) > c.appConfig.BridgingSettings.MaxReceiversPerBridgingRequest {
		return fmt.Errorf("number of receivers in metadata greater than maximum allowed - no: %v, max: %v, requestBody: %v",
			len(requestBody.Transactions), c.appConfig.BridgingSettings.MaxReceiversPerBridgingRequest, requestBody)
	}

	feeSum := uint64(0)
	foundAUtxoValueBelowMinimumValue := false
	foundAnInvalidReceiverAddr := false
	transactions := make([]request.CreateBridgingTxTransactionRequest, 0, len(requestBody.Transactions))

	for _, receiver := range requestBody.Transactions {
		if cardanoDestConfig != nil {
			if receiver.Amount < c.appConfig.BridgingSettings.UtxoMinValue {
				foundAUtxoValueBelowMinimumValue = true

				break
			}

			addr, err := wallet.NewAddress(receiver.Addr)
			if err != nil || addr.GetNetwork() != cardanoDestConfig.NetworkID {
				foundAnInvalidReceiverAddr = true

				break
			}

			// if fee address is specified in transactions just add amount to the fee sum
			// otherwise keep this transaction
			if receiver.Addr == cardanoDestConfig.BridgingAddresses.FeeAddress {
				feeSum += receiver.Amount
			} else {
				transactions = append(transactions, receiver)
			}
		} else if ethDestConfig != nil {
			if !goEthCommon.IsHexAddress(receiver.Addr) {
				foundAnInvalidReceiverAddr = true

				break
			}

			if receiver.Addr == ethDestConfig.BridgingAddresses.FeeAddress {
				feeSum += receiver.Amount
			} else {
				transactions = append(transactions, receiver)
			}
		}
	}

	requestBody.BridgingFee += feeSum
	requestBody.Transactions = transactions

	// this is just convinient way to setup default min fee
	if requestBody.BridgingFee == 0 {
		requestBody.BridgingFee = c.appConfig.BridgingSettings.MinFeeForBridging
	}

	if foundAUtxoValueBelowMinimumValue {
		return fmt.Errorf("found a utxo value below minimum value in request body receivers: %v", requestBody)
	}

	if foundAnInvalidReceiverAddr {
		return fmt.Errorf("found an invalid receiver addr in request body: %v", requestBody)
	}

	if requestBody.BridgingFee < c.appConfig.BridgingSettings.MinFeeForBridging {
		return fmt.Errorf("bridging fee in request body is less than minimum: %v", requestBody)
	}

	return nil
}

func (c *CardanoTxControllerImpl) createTx(requestBody request.CreateBridgingTxRequest) (
	string, string, uint64, error,
) {
	sourceChainConfig := c.appConfig.CardanoChains[requestBody.SourceChainID]

	txProvider, err := sourceChainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to create tx provider: %w", err)
	}

	bridgingAddress := sourceChainConfig.BridgingAddresses.BridgingAddress
	if requestBody.UseFallback {
		bridgingAddress = sourceChainConfig.BridgingAddresses.FallbackAddress
	}

	bridgingTxSender := cardanotx.NewBridgingTxSender(
		wallet.ResolveCardanoCliBinary(sourceChainConfig.NetworkID),
		txProvider, nil, uint(sourceChainConfig.NetworkMagic),
		bridgingAddress,
		sourceChainConfig.ChainSpecific.TTLSlotNumberInc,
	)

	bridgingTxSender.PotentialFee = sourceChainConfig.ChainSpecific.PotentialFee

	receivers := make([]wallet.TxOutput, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = wallet.TxOutput{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
	}

	txRawBytes, txHash, fee, err := bridgingTxSender.CreateTx(
		context.Background(), requestBody.DestinationChainID,
		requestBody.SenderAddr, receivers, requestBody.BridgingFee,
	)
	if err != nil {
		return "", "", 0, fmt.Errorf("failed to build tx: %w", err)
	}

	txRaw := hex.EncodeToString(txRawBytes)

	return txRaw, txHash, fee, nil
}

func (c *CardanoTxControllerImpl) signTx(requestBody request.SignBridgingTxRequest) (
	string, error,
) {
	signingKeyBytes, err := common.DecodeHex(requestBody.SigningKeyHex)
	if err != nil {
		return "", fmt.Errorf("failed to decode singing key hex: %w", err)
	}

	txRawBytes, err := common.DecodeHex(requestBody.TxRaw)
	if err != nil {
		return "", fmt.Errorf("failed to decode raw tx: %w", err)
	}

	cardanoCliBinary := wallet.ResolveCardanoCliBinary(wallet.CardanoNetworkType(requestBody.NetworkID))
	senderWallet := wallet.NewWallet(
		wallet.GetVerificationKeyFromSigningKey(signingKeyBytes), signingKeyBytes)

	txBuilder, err := wallet.NewTxBuilder(cardanoCliBinary)
	if err != nil {
		return "", fmt.Errorf("failed to create tx builder: %w", err)
	}

	defer txBuilder.Dispose()

	witness, err := wallet.CreateTxWitness(requestBody.TxHash, senderWallet)
	if err != nil {
		return "", fmt.Errorf("failed to create witness: %w", err)
	}

	signedTxBytes, err := txBuilder.AssembleTxWitnesses(txRawBytes, [][]byte{witness})
	if err != nil {
		return "", fmt.Errorf("failed to sign tx: %w", err)
	}

	return hex.EncodeToString(signedTxBytes), nil
}
