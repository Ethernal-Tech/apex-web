package utils

import (
	"sync"
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type CacheUtxosTransformer struct {
	UtxoCacher *UsedUtxoCacher
	Addr       string
}

var _ sendtx.IUtxosTransformer = (*CacheUtxosTransformer)(nil)

type txInputWithTime struct {
	wallet.TxInput
	Time time.Time
}

type UsedUtxoCacher struct {
	timeout time.Duration
	data    map[string]map[string]txInputWithTime
	lock    sync.Mutex
}

func NewUsedUtxoCacher(timeout time.Duration) *UsedUtxoCacher {
	return &UsedUtxoCacher{
		data:    map[string]map[string]txInputWithTime{},
		timeout: timeout,
	}
}

func (c *UsedUtxoCacher) Add(addr string, txInputs []wallet.TxInput) {
	c.lock.Lock()
	defer c.lock.Unlock()

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
	c.lock.Lock()
	defer c.lock.Unlock()

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

func (u *CacheUtxosTransformer) TransformUtxos(utxos []wallet.Utxo) []wallet.Utxo {
	cachedInputs := u.UtxoCacher.Get(u.Addr)

	cachedMap := make(map[string]struct{})
	for _, cachedInput := range cachedInputs {
		cachedMap[cachedInput.String()] = struct{}{}
	}

	var filteredUtxos []wallet.Utxo

	for _, utxo := range utxos {
		txInput := wallet.TxInput{
			Index: utxo.Index,
			Hash:  utxo.Hash,
		}
		if _, exists := cachedMap[txInput.String()]; !exists {
			filteredUtxos = append(filteredUtxos, utxo)
		}
	}

	return filteredUtxos
}

func (u *CacheUtxosTransformer) UpdateUtxos(usedInputs []wallet.TxInput) {
	u.UtxoCacher.Add(u.Addr, usedInputs)
}
