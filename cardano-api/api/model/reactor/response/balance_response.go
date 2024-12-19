package response

import "math/big"

type BalanceResponse struct {
	Balance string `json:"balance"`
}

func NewBalanceResponse(
	balance *big.Int,
) *BalanceResponse {
	return &BalanceResponse{
		Balance: balance.String(),
	}
}
