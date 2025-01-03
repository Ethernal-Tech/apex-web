package response

import "strconv"

type BalanceResponse struct {
	Balance map[string]string `json:"balance"`
}

func NewBalanceResponse(
	balances map[string]uint64,
) *BalanceResponse {
	balanceMap := make(map[string]string)
	for token, balance := range balances {
		balanceMap[token] = strconv.FormatUint(balance, 10)
	}

	return &BalanceResponse{
		Balance: balanceMap,
	}
}
