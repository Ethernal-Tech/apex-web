package response

import "github.com/Ethernal-Tech/cardano-api/txindexer"

type NewBridgingTxsResponse struct {
	// Indexed bridging transactions ordered by sequence number
	Txs []*txindexer.BridgingTx `json:"txs"`
	// Sequence number to be used as `after` in the next request
	LastSeq uint64 `json:"lastSeq"`
	// True if transactions after the requested sequence number were already pruned
	HasGap bool `json:"hasGap"`
	// True if the requested sequence number was never assigned (e.g. indexer database was recreated).
	// The client should start again from 0
	CursorAhead bool `json:"cursorAhead"`
} // @name NewBridgingTxsResponse

func NewNewBridgingTxsResponse(page *txindexer.BridgingTxsPage, after uint64) *NewBridgingTxsResponse {
	txs := page.Txs
	if txs == nil {
		txs = []*txindexer.BridgingTx{}
	}

	lastSeq := after
	if len(txs) > 0 {
		lastSeq = txs[len(txs)-1].Seq
	}

	return &NewBridgingTxsResponse{
		Txs:         txs,
		LastSeq:     lastSeq,
		HasGap:      page.OldestSeq > after+1,
		CursorAhead: after > page.CurrentSeq,
	}
}
