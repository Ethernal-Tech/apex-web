package response

import (
	"strconv"

	"github.com/Ethernal-Tech/cardano-api/common"
)

type BalanceResponse struct {
	Balance map[common.TokenName]string `json:"balance"`
}

func NewBalanceResponse(
	balances map[common.TokenName]uint64,
) *BalanceResponse {
	balanceMap := make(map[common.TokenName]string)
	for token, balance := range balances {
		balanceMap[token] = strconv.FormatUint(balance, 10)
	}

	return &BalanceResponse{
		Balance: balanceMap,
	}
}
