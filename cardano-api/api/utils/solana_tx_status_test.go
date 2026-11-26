package utils

import (
	"context"
	"errors"
	"testing"

	"github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	solanawallet "github.com/Ethernal-Tech/solana-infrastructure/wallet"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestFetchSolanaTxStatus(t *testing.T) {
	ctx := context.Background()
	signature := solana.Signature{1, 2, 3}

	const lastValidBlockHeight = uint64(1_000)

	found := func(status *rpc.SignatureStatusesResult) *rpc.GetSignatureStatusesResult {
		return &rpc.GetSignatureStatusesResult{Value: []*rpc.SignatureStatusesResult{status}}
	}
	notFound := &rpc.GetSignatureStatusesResult{Value: []*rpc.SignatureStatusesResult{nil}}

	t.Run("confirmed and finalized are confirmed, without reading the block height", func(t *testing.T) {
		for _, confirmation := range []rpc.ConfirmationStatusType{
			rpc.ConfirmationStatusConfirmed, rpc.ConfirmationStatusFinalized,
		} {
			provider := &solanawallet.MockTxProvider{}
			provider.On("GetSignatureStatus", ctx, signature).
				Return(found(&rpc.SignatureStatusesResult{ConfirmationStatus: confirmation}), nil)

			status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
			require.NoError(t, err)
			require.Equal(t, &response.SolanaTxStatusResponse{Status: response.SolanaTxStatusConfirmed}, status)
			provider.AssertNotCalled(t, "GetBlockHeight", mock.Anything)
		}
	})

	t.Run("processed is pending", func(t *testing.T) {
		provider := &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).
			Return(found(&rpc.SignatureStatusesResult{ConfirmationStatus: rpc.ConfirmationStatusProcessed}), nil)

		status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.NoError(t, err)
		require.Equal(t, response.SolanaTxStatusPending, status.Status)
		provider.AssertNotCalled(t, "GetBlockHeight", mock.Anything)
	})

	t.Run("an execution error is failed", func(t *testing.T) {
		provider := &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).Return(found(&rpc.SignatureStatusesResult{
			ConfirmationStatus: rpc.ConfirmationStatusConfirmed,
			Err:                map[string]any{"InstructionError": []any{0, "Custom"}},
		}), nil)

		status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.NoError(t, err)
		require.Equal(t, response.SolanaTxStatusFailed, status.Status)
		require.JSONEq(t, `{"InstructionError":[0,"Custom"]}`, status.Err)
	})

	t.Run("not found while the blockhash is valid is pending", func(t *testing.T) {
		for _, height := range []uint64{lastValidBlockHeight - 1, lastValidBlockHeight} {
			provider := &solanawallet.MockTxProvider{}
			provider.On("GetSignatureStatus", ctx, signature).Return(notFound, nil)
			provider.On("GetBlockHeight", ctx).Return(height, nil)

			status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
			require.NoError(t, err)
			require.Equal(t, response.SolanaTxStatusPending, status.Status)
		}
	})

	t.Run("not found after the blockhash expired is expired", func(t *testing.T) {
		provider := &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).Return(notFound, nil)
		provider.On("GetBlockHeight", ctx).Return(lastValidBlockHeight+1, nil)

		status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.NoError(t, err)
		require.Equal(t, response.SolanaTxStatusExpired, status.Status)
	})

	t.Run("an empty status list is treated as not found", func(t *testing.T) {
		provider := &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).Return(&rpc.GetSignatureStatusesResult{}, nil)
		provider.On("GetBlockHeight", ctx).Return(lastValidBlockHeight+1, nil)

		status, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.NoError(t, err)
		require.Equal(t, response.SolanaTxStatusExpired, status.Status)
	})

	t.Run("rpc errors are returned", func(t *testing.T) {
		provider := &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).Return(nil, errors.New("status down"))

		_, err := FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.ErrorContains(t, err, "status down")

		provider = &solanawallet.MockTxProvider{}
		provider.On("GetSignatureStatus", ctx, signature).Return(notFound, nil)
		provider.On("GetBlockHeight", ctx).Return(uint64(0), errors.New("height down"))

		_, err = FetchSolanaTxStatus(ctx, provider, signature, lastValidBlockHeight)
		require.ErrorContains(t, err, "height down")
	})
}
