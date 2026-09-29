package response

import "github.com/Ethernal-Tech/cardano-infrastructure/wallet"

// AddressBalanceResponse is the Cardano-family address balance payload.
type AddressBalanceResponse struct {
	Chain   string               `json:"chain"`
	Address string               `json:"address"`
	Amount  string               `json:"amount"`
	Tokens  []wallet.TokenAmount `json:"tokens"`
}

func NewAddressBalanceResponse(
	chain string,
	address string,
	amount string,
	tokens []wallet.TokenAmount,
) *AddressBalanceResponse {
	if tokens == nil {
		tokens = []wallet.TokenAmount{}
	}

	return &AddressBalanceResponse{
		Chain:   chain,
		Address: address,
		Amount:  amount,
		Tokens:  tokens,
	}
}
