package request

type CreateBridgingTxTransactionRequest struct {
	Addr          string `json:"addr"`
	Amount        uint64 `json:"amount"`
	IsNativeToken bool   `json:"isNativeToken"`
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
	UseFallback        bool                                 `json:"useFallback"`
	UTXOCacheKey       string                               `json:"utxoCacheKey"`
	SkipUtxos          []UtxoRequest                        `json:"skipUtxos"`
}
