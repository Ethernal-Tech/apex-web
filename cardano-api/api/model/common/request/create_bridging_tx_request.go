package request

type CreateBridgingTxTransactionRequest struct {
	// Receiver address
	Addr string `json:"addr" validate:"required"`
	// Amount to be bridged
	Amount uint64 `json:"amount" validate:"required"`
	// True if the amount is specified in a native token; false if in a currency on source chain
	IsNativeToken bool `json:"isNativeToken"`
} // @name CreateBridgingTxTransactionRequest

type UtxoRequest struct {
	// Transaction hash
	Hash string `json:"hash"`
	// Output index of UTXO
	Index uint32 `json:"index"`
} // @name UtxoRequest

type CreateBridgingTxRequest struct {
	// Address that initiates the bridging request on the source chain
	SenderAddr string `json:"senderAddr" validate:"required"`
	// Source chain ID
	SourceChainID string `json:"sourceChainId" validate:"required"`
	// Destination chain ID
	DestinationChainID string `json:"destinationChainId" validate:"required"`
	// Array of transactions requested by the sender
	Transactions []CreateBridgingTxTransactionRequest `json:"transactions" validate:"required"`
	// Fee covering the submission of the transaction on the destination chain, expressed in Lovelace
	BridgingFee uint64 `json:"bridgingFee"`
	// Fee covering the operational cost of processing the bridging request, expressed in Lovelace
	OperationFee uint64 `json:"operationFee"`
	// Indicates if fallback mechanism should be used
	UseFallback bool `json:"useFallback"`
	// Key used to enable caching of spent UTXOs
	UTXOCacheKey string `json:"utxoCacheKey"`
	// Specifies the UTXO to skip during transaction creation on the source chain
	SkipUtxos []UtxoRequest `json:"skipUtxos"`
} // @name CreateBridgingTxRequest
