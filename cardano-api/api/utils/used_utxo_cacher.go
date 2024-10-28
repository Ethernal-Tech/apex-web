package utils

import (
	"strconv"
	"strings"
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type UsedUtxoCacher struct {
	timeout time.Duration
	data    map[string]map[string]time.Time
}

func NewUsedUtxoCacher(timeout time.Duration) *UsedUtxoCacher {
	return &UsedUtxoCacher{
		data:    map[string]map[string]time.Time{},
		timeout: timeout,
	}
}

func (c *UsedUtxoCacher) Add(addr string, txInputs []wallet.TxInput) {
	var (
		submap map[string]time.Time
		tm     = time.Now().UTC()
	)

	if child, exists := c.data[addr]; !exists {
		submap = map[string]time.Time{}
		c.data[addr] = submap
	} else {
		submap = child
	}

	// remove old ones
	for k, v := range submap {
		if tm.Sub(v) > c.timeout {
			delete(submap, k)
		}
	}

	// add new ones
	for _, x := range txInputs {
		submap[x.String()] = tm
	}
}

func (c *UsedUtxoCacher) Get(addr string) []wallet.TxInput {
	tm := time.Now().UTC()
	submap, exists := c.data[addr]

	if !exists {
		return nil
	}

	result := make([]wallet.TxInput, 0, len(submap))

	// retrieve those that are still valid (remove expired)
	for k, v := range submap {
		if tm.Sub(v) > c.timeout {
			delete(submap, k)
		} else {
			parts := strings.Split(k, "#")
			index, _ := strconv.Atoi(parts[1])

			result = append(result, wallet.TxInput{
				Hash:  parts[0],
				Index: uint32(index), //nolint:gosec
			})
		}
	}

	return result
}
