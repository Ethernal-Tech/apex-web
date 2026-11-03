package telemetry

import "github.com/hashicorp/go-metrics"

const (
	indexersMetricsPrefix    = "indexers"
	bridgingTxsMetricsPrefix = "bridging_txs"
)

// UpdateIndexersBlockCounter is increased every time the indexer of a chain moves to a new
// block (slot). A counter that stops growing means the indexer of the chain is stuck.
func UpdateIndexersBlockCounter(chain string, cnt int) {
	metrics.IncrCounter([]string{indexersMetricsPrefix, "block_counter", chain}, float32(cnt))
}

// UpdateBridgingTxsUnpulled sets the number of indexed bridging txs web-api has not pulled yet.
// A value above zero for longer than a few pulls means web-api stopped pulling.
func UpdateBridgingTxsUnpulled(cnt uint64) {
	metrics.SetGauge([]string{bridgingTxsMetricsPrefix, "unpulled"}, float32(cnt))
}
