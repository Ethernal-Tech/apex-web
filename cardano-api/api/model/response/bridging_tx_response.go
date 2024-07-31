package response

type BridgingTxResponse struct {
	TxRaw       string `json:"txRaw"`
	TxHash      string `json:"txHash"`
	TxFee       uint64 `json:"txFee"`
	BridgingFee uint64 `json:"bridgingFee"`
}

func NewFullBridgingTxResponse(
	txRaw string, txHash string, txFee uint64, bridgingFee uint64,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:       txRaw,
		TxHash:      txHash,
		TxFee:       txFee,
		BridgingFee: bridgingFee,
	}
}

func NewBridgingTxResponse(
	txRaw string, txHash string,
) *BridgingTxResponse {
	return &BridgingTxResponse{
		TxRaw:  txRaw,
		TxHash: txHash,
	}
}
