package utils

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	solanawallet "github.com/Ethernal-Tech/solana-infrastructure/wallet"
	bin "github.com/gagliardetto/binary"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
)

// FetchSolanaAddressBalance returns the lamport balance of owner and, for each mint, the
// amount held in owner's associated token account. The bridge debits exactly that account,
// so it is the bridgeable balance. It makes one RPC call for SOL and one per mint.
func FetchSolanaAddressBalance(
	ctx context.Context,
	provider solanawallet.IUserDataRetriever,
	chainID string,
	owner solana.PublicKey,
	mints []solana.PublicKey,
) (*response.SolanaAddressBalanceResponse, error) {
	lamports, err := provider.GetBalance(ctx, owner)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %w", err)
	}

	tokens := make([]response.SolanaTokenBalanceResponse, 0, len(mints))

	for _, mint := range mints {
		amount, err := fetchAssociatedTokenAmount(ctx, provider, owner, mint)
		if err != nil {
			return nil, fmt.Errorf("failed to get balance of token %s: %w", mint, err)
		}

		tokens = append(tokens, response.SolanaTokenBalanceResponse{
			Mint:   mint.String(),
			Amount: strconv.FormatUint(amount, 10),
		})
	}

	return &response.SolanaAddressBalanceResponse{
		Chain:   chainID,
		Address: owner.String(),
		Amount:  strconv.FormatUint(lamports, 10),
		Tokens:  tokens,
	}, nil
}

func fetchAssociatedTokenAmount(
	ctx context.Context,
	provider solanawallet.IUserDataRetriever,
	owner solana.PublicKey,
	mint solana.PublicKey,
) (uint64, error) {
	ata, _, err := solanawallet.FindAssociatedTokenAddress(owner, mint)
	if err != nil {
		return 0, err
	}

	info, err := provider.GetAccountInfo(ctx, ata)
	if errors.Is(err, rpc.ErrNotFound) {
		// the owner never held this token
		return 0, nil
	} else if err != nil {
		return 0, err
	}

	if info == nil || info.Value == nil {
		return 0, nil
	}

	if !info.Value.Owner.Equals(solana.TokenProgramID) {
		return 0, fmt.Errorf("account %s is not owned by the token program", ata)
	}

	var account token.Account
	if err := bin.NewBinDecoder(info.Value.Data.GetBinary()).Decode(&account); err != nil {
		return 0, fmt.Errorf("failed to decode token account %s: %w", ata, err)
	}

	if !account.Mint.Equals(mint) {
		return 0, fmt.Errorf("token account %s holds mint %s, expected %s", ata, account.Mint, mint)
	}

	return account.Amount, nil
}
