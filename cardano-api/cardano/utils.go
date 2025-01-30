package cardanotx

import (
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

func IsValidOutputAddress(addr string, networkID wallet.CardanoNetworkType) bool {
	cardAddr, err := wallet.NewCardanoAddressFromString(addr)
	if err != nil ||
		cardAddr.GetInfo().AddressType == wallet.RewardAddress ||
		cardAddr.GetInfo().Network != networkID {
		return false
	}

	return true
}
