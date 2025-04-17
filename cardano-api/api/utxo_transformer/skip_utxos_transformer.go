package utxotransformer

import (
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type SkipUtxosTransformer struct {
	SkipUtxos []wallet.TxInput
}

var _ IUtxosTransformer = (*SkipUtxosTransformer)(nil)

func (s *SkipUtxosTransformer) TransformUtxos(utxos []wallet.Utxo) []wallet.Utxo {
	return filterOutUtxos(utxos, s.SkipUtxos)
}

func (s *SkipUtxosTransformer) UpdateUtxos(_ []wallet.TxInput) {}
