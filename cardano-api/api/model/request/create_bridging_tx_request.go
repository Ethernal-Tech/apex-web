package request

type CreateBridgingTxTransactionRequest struct {
	Addr   string `json:"addr"`
	Amount uint64 `json:"amount"`
}

type UtxoRequest struct {
	Hash  string `json:"hash"`
	Index uint32 `json:"index"`
}

type CreateBridgingTxRequest struct {
	SenderAddr         string                               `json:"senderAddr"`
	SourceChainID      string                               `json:"sourceChainId"`
	DestinationChainID string                               `json:"destinationChainId"`
	Transactions       []CreateBridgingTxTransactionRequest `json:"transactions"`
	BridgingFee        uint64                               `json:"bridgingFee"`
	SkipUtxos          []UtxoRequest                        `json:"skipUtxos"`
	UseFallback        bool                                 `json:"useFallback"`
}
