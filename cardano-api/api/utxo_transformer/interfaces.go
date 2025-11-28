package utxotransformer

import (
	"github.com/Ethernal-Tech/cardano-infrastructure/sendtx"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

type IUtxosTransformer interface {
	sendtx.IUtxosTransformer

	UpdateUtxos(usedInputs []wallet.TxInput)
}
