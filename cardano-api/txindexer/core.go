package txindexer

import (
	"time"
)

// BridgingTxReceiver is a single receiver of a bridging request, as stated on the source chain
type BridgingTxReceiver struct {
	Address string `json:"address"`
	Amount  string `json:"amount"`
	TokenID uint16 `json:"tokenID"`
} // @name BridgingTxReceiver

// BridgingTx is a bridging request observed on a source chain, without waiting for confirmations
type BridgingTx struct {
	// Sequence number. Increases with every newly indexed tx, web-api uses it as a cursor
	Seq uint64 `json:"seq"`
	// Source chain ID
	OriginChainID string `json:"originChainId"`
	// Tx hash on the source chain, formatted as web-api stores it
	// (cardano: hex without 0x, evm: hex with 0x, solana: base58 signature)
	TxHash             string               `json:"txHash"`
	DestinationChainID string               `json:"destinationChainId"`
	SenderAddr         string               `json:"senderAddr"`
	Receivers          []BridgingTxReceiver `json:"receivers"`
	BridgingFee        string               `json:"bridgingFee"`
	OperationFee       string               `json:"operationFee"`
	// Currency value sent with the tx (cardano: lovelace sent to bridging addresses, evm: tx value,
	// solana: value from the bridge request event)
	Value string `json:"value"`
	// Slot (cardano) or block number (evm, solana block height) of the block containing the tx
	BlockNumber uint64 `json:"blockNumber"`
	BlockHash   string `json:"blockHash"`
	// Upper bound of the tx TTL in the same units web-api uses for the chain
	TTL         uint64 `json:"ttl"`
	IsLayerZero bool   `json:"isLayerZero"`
	// Time when the tx was indexed for the first time
	IndexedAt time.Time `json:"indexedAt"`
} // @name BridgingTx

// sameLocation returns true if both txs are in the same block
func (tx *BridgingTx) sameLocation(other *BridgingTx) bool {
	return tx.BlockNumber == other.BlockNumber && tx.BlockHash == other.BlockHash
}

type BridgingTxsPage struct {
	Txs []*BridgingTx
	// The lowest sequence number still kept in the store (0 if empty)
	OldestSeq uint64
	// The last assigned sequence number
	CurrentSeq uint64
}

type BridgingTxsStore interface {
	// AddBridgingTxs inserts new txs. Already known txs keep their sequence number and only their
	// chain location is updated
	AddBridgingTxs(txs []*BridgingTx) error
	// GetBridgingTxs returns up to limit txs with sequence number greater than after
	GetBridgingTxs(after uint64, limit int) (*BridgingTxsPage, error)
	// PruneBridgingTxs removes txs indexed before the given time
	PruneBridgingTxs(indexedBefore time.Time) (int, error)
}
