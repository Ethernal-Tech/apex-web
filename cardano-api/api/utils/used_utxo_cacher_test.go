package utils

import (
	"sort"
	"testing"
	"time"

	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
	"github.com/stretchr/testify/require"
)

func TestUsedItemsCacher(t *testing.T) {
	firstAddr := "0xf7"
	secondAddr := "0x05"
	firstTxInputs := []wallet.TxInput{
		{
			Hash: "0x11", Index: 1,
		},
		{
			Hash: "0x11", Index: 5,
		},
		{
			Hash: "0x55", Index: 0,
		},
		{
			Hash: "0x1003", Index: 78,
		},
	}
	secondTxInputs := []wallet.TxInput{
		{
			Hash: "0x100", Index: 1,
		},
		{
			Hash: "0x1003", Index: 11,
		},
	}
	cacher := NewUsedUtxoCacher(time.Millisecond * 100)

	getAndSort := func(addr string) []wallet.TxInput {
		result := cacher.Get(addr)

		sort.Slice(result, func(i, j int) bool {
			return result[i].String() < result[j].String()
		})

		return result
	}

	t.Run("Add on empty", func(t *testing.T) {
		cacher.Add(firstAddr, firstTxInputs[:3])
		cacher.Add(secondAddr, secondTxInputs[:1])
	})
	t.Run("Get after add", func(t *testing.T) {
		require.Equal(t, firstTxInputs[:3], getAndSort(firstAddr))
		require.Equal(t, secondTxInputs[:1], getAndSort(secondAddr))
	})
	t.Run("Add second time", func(t *testing.T) {
		time.Sleep(time.Millisecond * 120)
		cacher.Add(firstAddr, firstTxInputs[3:4])
		cacher.Add(secondAddr, secondTxInputs[1:2])
	})
	t.Run("Get second time", func(t *testing.T) {
		require.Equal(t, firstTxInputs[3:4], getAndSort(firstAddr))
		require.Equal(t, secondTxInputs[1:2], getAndSort(secondAddr))
	})
	t.Run("Get third time", func(t *testing.T) {
		time.Sleep(time.Millisecond * 120)
		require.Equal(t, []wallet.TxInput{}, getAndSort(firstAddr))
		require.Equal(t, []wallet.TxInput{}, getAndSort(secondAddr))
	})
}
