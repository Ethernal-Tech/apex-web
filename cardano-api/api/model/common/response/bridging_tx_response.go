package response

import "encoding/hex"

type BridgingTxResponse struct {
	TxRaw             string `json:"txRaw"`
	TxHash            string `json:"txHash"`
	BridgingFee       uint64 `json:"bridgingFee"`
	Amount            uint64 `json:"amount"`
	NativeTokenAmount uint64 `json:"nativeTokenAmount"`
}

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
	Fee         uint64 `json:"fee"`
	BridgingFee uint64 `json:"bridgingFee"`
}

func NewBridgingTxFeeResponse(fee uint64, bridgingFee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee:         fee,
		BridgingFee: bridgingFee,
	}
}
