package solanatx

import (
	"testing"

	"github.com/gagliardetto/solana-go"
	computebudget "github.com/gagliardetto/solana-go/programs/compute-budget"
	"github.com/gagliardetto/solana-go/programs/system"
	"github.com/stretchr/testify/require"
)

func buildTx(t *testing.T, feePayer solana.PublicKey, instructions ...solana.Instruction) *solana.Transaction {
	t.Helper()

	tx, err := solana.NewTransaction(instructions, solana.Hash{}, solana.TransactionPayer(feePayer))
	require.NoError(t, err)

	return tx
}

func TestTxFeeLamports(t *testing.T) {
	payer := solana.NewWallet().PublicKey()
	cosigner := solana.NewWallet().PublicKey()
	receiver := solana.NewWallet().PublicKey()

	transfer := system.NewTransferInstruction(1, payer, receiver).Build()

	t.Run("base fee only", func(t *testing.T) {
		fee, err := TxFeeLamports(buildTx(t, payer, transfer))
		require.NoError(t, err)
		require.Equal(t, LamportsPerSignature, fee)
	})

	t.Run("base fee per required signature", func(t *testing.T) {
		fee, err := TxFeeLamports(buildTx(t, payer, transfer, system.NewTransferInstruction(1, cosigner, receiver).Build()))
		require.NoError(t, err)
		require.Equal(t, 2*LamportsPerSignature, fee)
	})

	t.Run("compute unit limit without price adds nothing", func(t *testing.T) {
		fee, err := TxFeeLamports(buildTx(t, payer,
			computebudget.NewSetComputeUnitLimitInstruction(300_000).Build(),
			transfer,
		))
		require.NoError(t, err)
		require.Equal(t, LamportsPerSignature, fee)
	})

	t.Run("priority fee uses the requested limit, rounded up", func(t *testing.T) {
		fee, err := TxFeeLamports(buildTx(t, payer,
			computebudget.NewSetComputeUnitLimitInstruction(300_001).Build(),
			computebudget.NewSetComputeUnitPriceInstruction(10).Build(),
			transfer,
		))
		require.NoError(t, err)
		// ceil(10 * 300_001 / 1e6) = 4
		require.Equal(t, LamportsPerSignature+4, fee)
	})

	t.Run("priority fee uses the default limit when none is set", func(t *testing.T) {
		fee, err := TxFeeLamports(buildTx(t, payer,
			computebudget.NewSetComputeUnitPriceInstruction(1_000_000).Build(),
			transfer,
			transfer,
		))
		require.NoError(t, err)
		// 1 lamport per unit * 2 instructions * 200_000 units
		require.Equal(t, LamportsPerSignature+400_000, fee)
	})

	t.Run("default limit is capped", func(t *testing.T) {
		require.Equal(t, uint32(1_400_000), defaultComputeUnitLimit(100))
	})
}
