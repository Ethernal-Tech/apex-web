package response

import "encoding/hex"

type BridgingTxResponse struct {
	TxRaw             string `json:"txRaw"`
	TxHash            string `json:"txHash"`
	BridgingFee       uint64 `json:"bridgingFee"`
	Amount            uint64 `json:"amount"`
	NativeTokenAmount uint64 `json:"nativeTokenAmount"`
}

func NewFullBridgingTxResponse(
	txRawBytes []byte, txHash string, bridgingFee uint64, amount uint64, nativeTokenAmount uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:             hex.EncodeToString(txRawBytes),
		TxHash:            txHash,
		BridgingFee:       bridgingFee,
		Amount:            amount,
		NativeTokenAmount: nativeTokenAmount,
	}
}

type BridgingTxFeeResponse struct {
	Fee uint64 `json:"fee"`
}

func NewBridgingTxFeeResponse(fee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee: fee,
	}
}
