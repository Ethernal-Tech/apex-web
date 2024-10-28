package utils

import (
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type txInputWithTime struct {
	wallet.TxInput
	Time time.Time
}

type UsedUtxoCacher struct {
	timeout time.Duration
	data    map[string]map[string]txInputWithTime
}

func NewUsedUtxoCacher(timeout time.Duration) *UsedUtxoCacher {
	return &UsedUtxoCacher{
		data:    map[string]map[string]txInputWithTime{},
		timeout: timeout,
	}
}

func (c *UsedUtxoCacher) Add(addr string, txInputs []wallet.TxInput) {
	var (
		submap map[string]txInputWithTime
		tm     = time.Now().UTC()
	)

	if child, exists := c.data[addr]; !exists {
		submap = map[string]txInputWithTime{}
		c.data[addr] = submap
	} else {
		submap = child
	}

	// remove old ones
	for k, v := range submap {
		if tm.Sub(v.Time) >= c.timeout {
			delete(submap, k)
		}
	}

	// add new ones
	for _, x := range txInputs {
		submap[x.String()] = txInputWithTime{
			TxInput: x,
			Time:    tm,
		}
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
		if tm.Sub(v.Time) >= c.timeout {
			delete(submap, k)
		} else {
			result = append(result, v.TxInput)
		}
	}

	return result
}
