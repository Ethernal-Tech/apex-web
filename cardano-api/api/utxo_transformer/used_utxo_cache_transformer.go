package utxotransformer

import "github.com/Ethernal-Tech/cardano-infrastructure/wallet"

type CacheUtxosTransformer struct {
	UtxoCacher *UsedUtxoCacher
	Addr       string
}

var _ IUtxosTransformer = (*CacheUtxosTransformer)(nil)

func (u *CacheUtxosTransformer) TransformUtxos(utxos []wallet.Utxo) []wallet.Utxo {
	cachedInputs := u.UtxoCacher.Get(u.Addr)

	return filterOutUtxos(utxos, cachedInputs)
}

func (u *CacheUtxosTransformer) UpdateUtxos(usedInputs []wallet.TxInput) {
	u.UtxoCacher.Add(u.Addr, usedInputs)
}
