package response

import "encoding/hex"

type BridgingTxResponse struct {
	TxRaw       string `json:"txRaw"`
	TxHash      string `json:"txHash"`
	BridgingFee uint64 `json:"bridgingFee"`
	Amount      uint64 `json:"amount"`
}

func NewFullBridgingTxResponse(
	txRawBytes []byte, txHash string, bridgingFee uint64, amount uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:       hex.EncodeToString(txRawBytes),
		TxHash:      txHash,
		BridgingFee: bridgingFee,
		Amount:      amount,
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
	Fee uint64 `json:"fee"`
}

func NewBridgingTxFeeResponse(fee uint64) *BridgingTxFeeResponse {
	return &BridgingTxFeeResponse{
		Fee: fee,
	}
}
