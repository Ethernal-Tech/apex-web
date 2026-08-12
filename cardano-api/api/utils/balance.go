package utils

import (
	"context"
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/Ethernal-Tech/cardano-api/core"
	infracommon "github.com/Ethernal-Tech/cardano-infrastructure/common"
	"github.com/Ethernal-Tech/cardano-infrastructure/wallet"
)

// FetchCardanoAddressBalance loads UTXOs for address on the given Cardano chain
// and returns native lovelace + aggregated native assets.
func FetchCardanoAddressBalance(
	ctx context.Context,
	cfg *core.CardanoChainConfig,
	address string,
) (*response.AddressBalanceResponse, error) {
	if cfg == nil {
		return nil, fmt.Errorf("chain config is nil")
	}

	txProvider, err := cfg.ChainSpecific.CreateTxProvider()
	if err != nil {
		return nil, fmt.Errorf("failed to create tx provider: %w", err)
	}

	utxos, err := infracommon.ExecuteWithRetry(ctx, func(ctx context.Context) ([]wallet.Utxo, error) {
		return txProvider.GetUtxos(ctx, address)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get utxos: %w", err)
	}

	sum := wallet.GetUtxosSum(utxos)
	tokens, err := wallet.GetTokensFromSumMap(sum)
	if err != nil {
		return nil, fmt.Errorf("failed to parse token balances: %w", err)
	}

	return response.NewAddressBalanceResponse(
		cfg.ChainID,
		address,
		fmt.Sprintf("%d", sum[wallet.AdaTokenName]),
		tokens,
	), nil
}
