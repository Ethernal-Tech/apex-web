package cardanotx

import (
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

func IsValidOutputAddress(addr string, networkID wallet.CardanoNetworkType) bool {
	cardAddr, err := wallet.NewAddress(addr)
	if err != nil {
		return false
	}

	_, ok := cardAddr.(*wallet.RewardAddress)

	return !ok && cardAddr.GetNetwork() == networkID
}
