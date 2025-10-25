package response

import (
	"encoding/hex"
	"strconv"
)

type BridgingTxResponse struct {
	TxRaw       string `json:"txRaw"`
	TxHash      string `json:"txHash"`
	BridgingFee string `json:"bridgingFee"`
}

func NewFullBridgingTxResponse(
	txRawBytes []byte, txHash string, bridgingFee uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:       hex.EncodeToString(txRawBytes),
		TxHash:      txHash,
		BridgingFee: strconv.FormatUint(bridgingFee, 10),
	}
}

func NewBridgingTxResponse(
	txRawBytes []byte, txHash string,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:  hex.EncodeToString(txRawBytes),
		TxHash: txHash,
	}
}

type BridgingTxFeeResponse struct {
	Fee string `json:"fee"`
}

func NewBridgingTxFeeResponse(fee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee: strconv.FormatUint(fee, 10),
	}
}
