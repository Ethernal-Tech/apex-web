package utils

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Ethernal-Tech/cardano-api/api/model/common/response"
	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
)

type solanaTxStatusRetriever interface {
	GetSignatureStatus(ctx context.Context, sig solana.Signature) (*rpc.GetSignatureStatusesResult, error)
	GetBlockHeight(ctx context.Context) (uint64, error)
}

// FetchSolanaTxStatus reports whether a submitted transaction landed. The block height is
// read only while the signature is not found, to tell a pending transaction from one whose
// blockhash expired. That height is finalized, so it lags the tip and expiry is never
// reported early.
func FetchSolanaTxStatus(
	ctx context.Context,
	retriever solanaTxStatusRetriever,
	signature solana.Signature,
	lastValidBlockHeight uint64,
) (*response.SolanaTxStatusResponse, error) {
	statuses, err := retriever.GetSignatureStatus(ctx, signature)
	if err != nil {
		return nil, fmt.Errorf("failed to get signature status: %w", err)
	}

	var status *rpc.SignatureStatusesResult
	if statuses != nil && len(statuses.Value) > 0 {
		status = statuses.Value[0]
	}

	if status != nil {
		if status.Err != nil {
			return &response.SolanaTxStatusResponse{
				Status: response.SolanaTxStatusFailed,
				Err:    txErrString(status.Err),
			}, nil
		}

		if status.ConfirmationStatus == rpc.ConfirmationStatusConfirmed ||
			status.ConfirmationStatus == rpc.ConfirmationStatusFinalized {
			return &response.SolanaTxStatusResponse{Status: response.SolanaTxStatusConfirmed}, nil
		}

		// processed: it is in a block, which may still be skipped, so keep waiting
		return &response.SolanaTxStatusResponse{Status: response.SolanaTxStatusPending}, nil
	}

	blockHeight, err := retriever.GetBlockHeight(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get block height: %w", err)
	}

	if blockHeight > lastValidBlockHeight {
		return &response.SolanaTxStatusResponse{Status: response.SolanaTxStatusExpired}, nil
	}

	return &response.SolanaTxStatusResponse{Status: response.SolanaTxStatusPending}, nil
}

func txErrString(txErr any) string {
	if s, ok := txErr.(string); ok {
		return s
	}

	bytes, err := json.Marshal(txErr)
	if err != nil {
		return fmt.Sprint(txErr)
	}

	return string(bytes)
}
