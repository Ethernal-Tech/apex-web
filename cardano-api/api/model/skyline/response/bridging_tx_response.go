package response

import "encoding/hex"

type BridgingTxResponse struct {
	TxRaw       string `json:"txRaw"`
	TxHash      string `json:"txHash"`
	BridgingFee uint64 `json:"bridgingFee"`
}

func NewFullBridgingTxResponse(
	txRawBytes []byte, txHash string, bridgingFee uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:       hex.EncodeToString(txRawBytes),
		TxHash:      txHash,
		BridgingFee: bridgingFee,
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
