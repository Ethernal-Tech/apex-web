package utxotransformer

import "github.com/Ethernal-Tech/cardano-infrastructure/wallet"

func filterOutUtxos(utxos []wallet.Utxo, utxosToSkip []wallet.TxInput) []wallet.Utxo {
	cachedMap := make(map[string]struct{})
	for _, cachedInput := range utxosToSkip {
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
