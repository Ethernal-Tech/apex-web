package response

import "strconv"

type SolanaTransactionResponse struct {
	// Unsigned Solana transaction, encoded as base64
	TxRaw string `json:"txRaw"`
	// Recent blockhash used when building the transaction (base58)
	BlockHash string `json:"blockHash"`
} // @name SolanaTransactionResponse

type BridgingSolanaTransactionResponse struct {
	SolTx        SolanaTransactionResponse `json:"solTx"`
	BridgingFee  string                    `json:"bridgingFee"`
	OperationFee string                    `json:"operationFee"`
	TokenAmount  string                    `json:"tokenAmount"`
	TokenID      uint16                    `json:"tokenID"`
} // @name BridgingSolanaTransactionResponse

type CreateSolanaBridgingTxFullResponse struct {
	BridgingTx BridgingSolanaTransactionResponse `json:"bridgingTx"`
} // @name CreateSolanaBridgingTxFullResponse

func NewCreateSolanaBridgingTxFullResponse(
	txRaw string,
	blockHash string,
	bridgingFee uint64,
	operationFee uint64,
	tokenAmount uint64,
	tokenID uint16,
) *CreateSolanaBridgingTxFullResponse {
	return &CreateSolanaBridgingTxFullResponse{
		BridgingTx: BridgingSolanaTransactionResponse{
			SolTx: SolanaTransactionResponse{
				TxRaw:     txRaw,
				BlockHash: blockHash,
			},
			BridgingFee:  strconv.FormatUint(bridgingFee, 10),
			OperationFee: strconv.FormatUint(operationFee, 10),
			TokenAmount:  strconv.FormatUint(tokenAmount, 10),
			TokenID:      tokenID,
		},
	}
}
