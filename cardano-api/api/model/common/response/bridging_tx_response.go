package response

import "encoding/hex"

type BridgingTxResponse struct {
	// Raw transaction data, encoded as a hexadecimal string
	TxRaw string `json:"txRaw"`
	// Transaction hash
	TxHash string `json:"txHash"`
	// Bridging fee for covering submission on the destination chain, expressed in Lovelace
	BridgingFee uint64 `json:"bridgingFee"`
	// Amount of currency to be bridged, expressed in Lovelace
	Amount uint64 `json:"amount"`
	// Amount of native token to be bridged
	NativeTokenAmount uint64 `json:"nativeTokenAmount"`
} // @name BridgingTxResponse

func NewBridgingTxResponse(
	txRaw []byte, txHash string, bridgingFee uint64, amount uint64, nativeTokenAmount uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:             hex.EncodeToString(txRaw),
		TxHash:            txHash,
		BridgingFee:       bridgingFee,
		Amount:            amount,
		NativeTokenAmount: nativeTokenAmount,
	}
}

type BridgingTxFeeResponse struct {
	// Transaction fee on the source chain, expressed in Lovelace
	Fee uint64 `json:"fee"`
	// Bridging fee for covering submission on the destination chain, expressed in Lovelace
	BridgingFee uint64 `json:"bridgingFee"`
} // @name BridgingTxFeeResponse

func NewBridgingTxFeeResponse(fee uint64, bridgingFee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee:         fee,
		BridgingFee: bridgingFee,
	}
}
