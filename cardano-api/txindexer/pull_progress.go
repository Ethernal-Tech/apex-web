package txindexer

import "sync/atomic"

// PullProgress keeps the sequence number the client of GetNew (web-api) has pulled up to.
// It is used only for telemetry, clients keep their own cursors.
type PullProgress struct {
	pulledSeq atomic.Uint64
	isKnown   atomic.Bool
}

// SetPulled stores `after` of the latest GetNew request, all txs up to it are already pulled
func (p *PullProgress) SetPulled(after uint64) {
	p.pulledSeq.Store(after)
	p.isKnown.Store(true)
}

// GetPulled returns false until the first GetNew request after start
func (p *PullProgress) GetPulled() (uint64, bool) {
	return p.pulledSeq.Load(), p.isKnown.Load()
}
