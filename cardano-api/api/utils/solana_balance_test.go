package utils

import (
	"bytes"
	"context"
	"errors"
	"testing"

	solanawallet "github.com/Ethernal-Tech/solana-infrastructure/wallet"
	bin "github.com/gagliardetto/binary"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func tokenAccountInfo(t *testing.T, programOwner, mint, owner solana.PublicKey, amount uint64) *rpc.GetAccountInfoResult {
	t.Helper()

	var buf bytes.Buffer

	require.NoError(t, bin.NewBinEncoder(&buf).Encode(token.Account{
		Mint:   mint,
		Owner:  owner,
		Amount: amount,
		State:  token.Initialized,
	}))

	return &rpc.GetAccountInfoResult{
		Value: &rpc.Account{
			Owner: programOwner,
			Data:  rpc.DataBytesOrJSONFromBytes(buf.Bytes()),
		},
	}
}

func TestFetchSolanaAddressBalance(t *testing.T) {
	ctx := context.Background()
	owner := solana.NewWallet().PublicKey()
	heldMint := solana.NewWallet().PublicKey()
	missingMint := solana.NewWallet().PublicKey()

	heldAta, _, err := solanawallet.FindAssociatedTokenAddress(owner, heldMint)
	require.NoError(t, err)

	missingAta, _, err := solanawallet.FindAssociatedTokenAddress(owner, missingMint)
	require.NoError(t, err)

	t.Run("returns lamports and associated token account amounts", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(1_500_000_000), nil)
		provider.On("GetAccountInfo", ctx, heldAta).
			Return(tokenAccountInfo(t, solana.TokenProgramID, heldMint, owner, 42), nil)
		provider.On("GetAccountInfo", ctx, missingAta).Return(nil, rpc.ErrNotFound)

		balance, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, []solana.PublicKey{heldMint, missingMint})
		require.NoError(t, err)

		require.Equal(t, "solana", balance.Chain)
		require.Equal(t, owner.String(), balance.Address)
		require.Equal(t, "1500000000", balance.Amount)
		require.Len(t, balance.Tokens, 2)
		require.Equal(t, heldMint.String(), balance.Tokens[0].Mint)
		require.Equal(t, "42", balance.Tokens[0].Amount)
		require.Equal(t, missingMint.String(), balance.Tokens[1].Mint)
		require.Equal(t, "0", balance.Tokens[1].Amount)
		provider.AssertExpectations(t)
	})

	t.Run("without mints only reads lamports", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(7), nil)

		balance, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, nil)
		require.NoError(t, err)

		require.Equal(t, "7", balance.Amount)
		require.Empty(t, balance.Tokens)
		provider.AssertNotCalled(t, "GetAccountInfo", mock.Anything, mock.Anything)
	})

	t.Run("fails when the balance call fails", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(0), errors.New("rpc down"))

		_, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, []solana.PublicKey{heldMint})
		require.ErrorContains(t, err, "rpc down")
	})

	t.Run("fails when a token account call fails", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(7), nil)
		provider.On("GetAccountInfo", ctx, heldAta).Return(nil, errors.New("rate limited"))

		_, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, []solana.PublicKey{heldMint})
		require.ErrorContains(t, err, "rate limited")
	})

	t.Run("rejects an account not owned by the token program", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(7), nil)
		provider.On("GetAccountInfo", ctx, heldAta).
			Return(tokenAccountInfo(t, solana.SystemProgramID, heldMint, owner, 42), nil)

		_, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, []solana.PublicKey{heldMint})
		require.ErrorContains(t, err, "not owned by the token program")
	})

	t.Run("rejects a token account of another mint", func(t *testing.T) {
		provider := &solanawallet.MockUserDataRetriever{}
		provider.On("GetBalance", ctx, owner).Return(uint64(7), nil)
		provider.On("GetAccountInfo", ctx, heldAta).
			Return(tokenAccountInfo(t, solana.TokenProgramID, missingMint, owner, 42), nil)

		_, err := FetchSolanaAddressBalance(ctx, provider, "solana", owner, []solana.PublicKey{heldMint})
		require.ErrorContains(t, err, "expected")
	})
}
