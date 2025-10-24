package response

import (
	"encoding/hex"
	"strconv"
)

type BridgingTxResponse struct {
	// Raw transaction data, encoded as a hexadecimal string
	TxRaw string `json:"txRaw"`
	// Transaction hash
	TxHash string `json:"txHash"`
	// Bridging fee for covering submission on the destination chain, expressed in Lovelace
	BridgingFee string `json:"bridgingFee"`
	// Amount of currency to be bridged, expressed in Lovelace
	Amount string `json:"amount"`
	// Amount of native token to be bridged
	NativeTokenAmount string `json:"nativeTokenAmount"`
} // @name BridgingTxResponse

func NewBridgingTxResponse(
	txRaw []byte, txHash string, bridgingFee uint64, amount uint64, nativeTokenAmount uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:             hex.EncodeToString(txRaw),
		TxHash:            txHash,
		BridgingFee:       strconv.FormatUint(bridgingFee, 10),
		Amount:            strconv.FormatUint(amount, 10),
		NativeTokenAmount: strconv.FormatUint(nativeTokenAmount, 10),
	}
}

type BridgingTxFeeResponse struct {
	// Transaction fee on the source chain, expressed in Lovelace
	Fee string `json:"fee"`
	// Bridging fee for covering submission on the destination chain, expressed in Lovelace
	BridgingFee string `json:"bridgingFee"`
} // @name BridgingTxFeeResponse

func NewBridgingTxFeeResponse(fee uint64, bridgingFee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee:         strconv.FormatUint(fee, 10),
		BridgingFee: strconv.FormatUint(bridgingFee, 10),
	}
}
