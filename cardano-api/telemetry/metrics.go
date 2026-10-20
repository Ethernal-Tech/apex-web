package telemetry

import "github.com/hashicorp/go-metrics"

const indexersMetricsPrefix = "indexers"

// UpdateIndexersBlockCounter is increased every time the indexer of a chain moves to a new
// block (slot). The same metric as in apex-bridge, a counter that stops growing means the
// indexer of the chain is stuck.
func UpdateIndexersBlockCounter(chain string, cnt int) {
	metrics.IncrCounter([]string{indexersMetricsPrefix, "block_counter", chain}, float32(cnt))
}
