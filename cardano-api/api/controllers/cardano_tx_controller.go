package controllers

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

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
	appConfig      *core.AppConfig
	usedUtxoCacher *utils.UsedUtxoCacher
	logger         hclog.Logger
}

var _ core.APIController = (*CardanoTxControllerImpl)(nil)

func NewCardanoTxController(
	appConfig *core.AppConfig,
	logger hclog.Logger,
) *CardanoTxControllerImpl {
	return &CardanoTxControllerImpl{
		appConfig:      appConfig,
		usedUtxoCacher: utils.NewUsedUtxoCacher(appConfig.UtxoCacheTimeout),
		logger:         logger,
	}
}

func (*CardanoTxControllerImpl) GetPathPrefix() string {
	return "CardanoTx"
}

func (c *CardanoTxControllerImpl) GetEndpoints() []*core.APIEndpoint {
	return []*core.APIEndpoint{
		{Path: "CreateBridgingTx", Method: http.MethodPost, Handler: c.createBridgingTx, APIKeyAuth: true},
		{Path: "GetBridgingTxFee", Method: http.MethodPost, Handler: c.getBridgingTxFee, APIKeyAuth: true},
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
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("chainId missing from query"), c.logger)

		return
	}

	addressArr, exists := queryValues["address"]
	if !exists || len(addressArr) == 0 {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("address missing from query"), c.logger)

		return
	}

	chainID := chainIDArr[0]
	address := addressArr[0]

	chainConfig, exists := c.appConfig.CardanoChains[chainID]
	if !exists {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			errors.New("chainID not registered"), c.logger)

		return
	}

	txProvider, err := chainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("failed to create tx provider. err: %w", err), c.logger)

		return
	}

	var utxos []wallet.Utxo

	err = wallet.ExecuteWithRetry(context.Background(), 10, 1*time.Second,
		func() (bool, error) {
			utxos, err = txProvider.GetUtxos(context.Background(), address)

			return err == nil, err
		}, common.OgmiosIsRecoverableError)

	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("failed to get utxos. err: %w", err), c.logger)

		return
	}

	balance := big.NewInt(0)

	for _, utxo := range utxos {
		balance.Add(balance, new(big.Int).SetUint64(utxo.Amount))
	}

	c.logger.Debug("getBalance success", "url", r.URL)

	utils.WriteResponse(w, r, http.StatusOK, response.NewBalanceResponse(balance), c.logger)
}

func (c *CardanoTxControllerImpl) getBridgingTxFee(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("getBridgingTxFee called", "url", r.URL)

	requestBody, ok := utils.DecodeModel[request.CreateBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	c.logger.Debug("getBridgingTxFee request", "body", requestBody, "url", r.URL)

	err := c.validateAndFillOutCreateBridgingTxRequest(&requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	bridgingTxSender, outputs, err := c.getBridgingTxSenderAndOutputs(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	fee, err := bridgingTxSender.GetTxFee(
		context.Background(), requestBody.DestinationChainID,
		requestBody.SenderAddr, outputs, requestBody.BridgingFee,
		c.usedUtxoCacher.Get(requestBody.SenderAddr),
	)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	c.logger.Debug("getBridgingTxFee success", "url", r.URL)

	utils.WriteResponse(w, r, http.StatusOK, response.NewBridgingTxFeeResponse(fee), c.logger)
}

func (c *CardanoTxControllerImpl) createBridgingTx(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("createBridgingTx called", "url", r.URL)

	requestBody, ok := utils.DecodeModel[request.CreateBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	c.logger.Debug("createBridgingTx request", "body", requestBody, "url", r.URL)

	err := c.validateAndFillOutCreateBridgingTxRequest(&requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	bridgingTxSender, outputs, err := c.getBridgingTxSenderAndOutputs(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest,
			fmt.Errorf("validation error. err: %w", err), c.logger)

		return
	}

	txRawBytes, txHash, txInputs, err := bridgingTxSender.CreateTx(
		context.Background(), requestBody.DestinationChainID,
		requestBody.SenderAddr, outputs, requestBody.BridgingFee,
		c.usedUtxoCacher.Get(requestBody.SenderAddr),
	)
	if err != nil {
		utils.WriteErrorResponse(w, r, http.StatusInternalServerError, err, c.logger)

		return
	}

	c.usedUtxoCacher.Add(requestBody.SenderAddr, txInputs) // cache chosen txInputs

	c.logger.Debug("createBridgingTx success", "url", r.URL)

	utils.WriteResponse(
		w, r, http.StatusOK,
		response.NewFullBridgingTxResponse(txRawBytes, txHash, requestBody.BridgingFee), c.logger)
}

func (c *CardanoTxControllerImpl) signBridgingTx(w http.ResponseWriter, r *http.Request) {
	c.logger.Debug("signBridgingTx called", "url", r.URL)

	requestBody, ok := utils.DecodeModel[request.SignBridgingTxRequest](w, r, c.logger)
	if !ok {
		return
	}

	if requestBody.TxRaw == "" || requestBody.SigningKeyHex == "" || requestBody.TxHash == "" {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, errors.New("invalid input data"), c.logger)

		return
	}

	c.logger.Debug("signBridgingTx request", "body", requestBody, "url", r.URL)

	signedTx, err := c.signTx(requestBody)
	if err != nil {
		utils.WriteErrorResponse(
			w, r, http.StatusBadRequest, errors.New("validation error"), c.logger)

		return
	}

	c.logger.Debug("signBridgingTx success", "url", r.URL)

	utils.WriteResponse(
		w, r, http.StatusOK,
		response.NewBridgingTxResponse(signedTx, requestBody.TxHash), c.logger)
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

			if receiver.Addr == common.EthZeroAddr {
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

func (c *CardanoTxControllerImpl) getBridgingTxSenderAndOutputs(
	requestBody request.CreateBridgingTxRequest,
) (*cardanotx.BridgingTxSender, []wallet.TxOutput, error) {
	sourceChainConfig, exists := c.appConfig.CardanoChains[requestBody.SourceChainID]
	if !exists {
		return nil, nil, fmt.Errorf("chain does not exists: %s", requestBody.SourceChainID)
	}

	txProvider, err := sourceChainConfig.ChainSpecific.CreateTxProvider()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create tx provider: %w", err)
	}

	bridgingAddress := sourceChainConfig.BridgingAddresses.BridgingAddress
	if requestBody.UseFallback {
		bridgingAddress = sourceChainConfig.BridgingAddresses.FallbackAddress
	}

	bridgingTxSender := cardanotx.NewBridgingTxSender(
		wallet.ResolveCardanoCliBinary(sourceChainConfig.NetworkID),
		txProvider, txProvider, uint(sourceChainConfig.NetworkMagic),
		bridgingAddress,
		sourceChainConfig.ChainSpecific.TTLSlotNumberInc,
		sourceChainConfig.ChainSpecific.PotentialFee, c.logger,
	)

	receivers := make([]wallet.TxOutput, len(requestBody.Transactions))
	for i, tx := range requestBody.Transactions {
		receivers[i] = wallet.TxOutput{
			Addr:   tx.Addr,
			Amount: tx.Amount,
		}
	}

	return bridgingTxSender, receivers, nil
}

func (c *CardanoTxControllerImpl) signTx(requestBody request.SignBridgingTxRequest) ([]byte, error) {
	signingKeyBytes, err := common.DecodeHex(requestBody.SigningKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode singing key hex: %w", err)
	}

	txRawBytes, err := common.DecodeHex(requestBody.TxRaw)
	if err != nil {
		return nil, fmt.Errorf("failed to decode raw tx: %w", err)
	}

	cardanoCliBinary := wallet.ResolveCardanoCliBinary(wallet.CardanoNetworkType(requestBody.NetworkID))
	senderWallet := wallet.NewWallet(
		wallet.GetVerificationKeyFromSigningKey(signingKeyBytes), signingKeyBytes)

	txBuilder, err := wallet.NewTxBuilder(cardanoCliBinary)
	if err != nil {
		return nil, fmt.Errorf("failed to create tx builder: %w", err)
	}

	defer txBuilder.Dispose()

	witness, err := wallet.CreateTxWitness(requestBody.TxHash, senderWallet)
	if err != nil {
		return nil, fmt.Errorf("failed to create witness: %w", err)
	}

	signedTxBytes, err := txBuilder.AssembleTxWitnesses(txRawBytes, [][]byte{witness})
	if err != nil {
		return nil, fmt.Errorf("failed to sign tx: %w", err)
	}

	return signedTxBytes, nil
}
