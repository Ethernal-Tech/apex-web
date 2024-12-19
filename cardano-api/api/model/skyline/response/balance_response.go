package response

import "math/big"

type BalanceResponse struct {
	Balance map[string]string `json:"balance"`
}

func NewBalanceResponse(
	balances map[string]*big.Int,
) *BalanceResponse {
	balanceMap := make(map[string]string)
	for token, balance := range balances {
		balanceMap[token] = balance.String()
	}

	return &BalanceResponse{
		Balance: balanceMap,
	}
}
