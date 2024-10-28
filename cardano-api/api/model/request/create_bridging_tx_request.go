package request

import (
	"encoding/json"
	"io"
)

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
	UseFallback        bool                                 `json:"useFallback"`
}

func NewCreateBridgingTxRequestFromIO(data io.Reader) (result CreateBridgingTxRequest, err error) {
	err = json.NewDecoder(data).Decode(&result)

	return result, err
}
