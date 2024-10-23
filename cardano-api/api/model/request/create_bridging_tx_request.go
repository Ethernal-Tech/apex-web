package request

type CreateBridgingTxTransactionRequest struct {
	Addr   string `json:"addr"`
	Amount uint64 `json:"amount"`
}

type CreateBridgingTxRequest struct {
	SenderAddr         string                               `json:"senderAddr"`
	SourceChainID      string                               `json:"sourceChainId"`
	DestinationChainID string                               `json:"destinationChainId"`
	Transactions       []CreateBridgingTxTransactionRequest `json:"transactions"`
	BridgingFee        uint64                               `json:"bridgingFee"`
	SkipUtxoHashes     []string                             `json:"skipUtxoHashes"`
	UseFallback        bool                                 `json:"useFallback"`
}
