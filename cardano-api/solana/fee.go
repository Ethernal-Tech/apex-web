package solanatx

import (
	"fmt"
	"math/big"

	solTxSender "github.com/Ethernal-Tech/solana-infrastructure/sendtx"
	"github.com/gagliardetto/solana-go"
	computebudget "github.com/gagliardetto/solana-go/programs/compute-budget"
)

const (
	// LamportsPerSignature is the Solana base fee charged for each required signature.
	LamportsPerSignature uint64 = 5_000

	microLamportsPerLamport = 1_000_000
)

// TxFeeLamports returns the network fee the fee payer is charged for a legacy or v0
// transaction: the base fee per required signature plus the priority fee requested
// through ComputeBudget instructions. It needs no RPC call, unlike getFeeForMessage.
func TxFeeLamports(tx *solana.Transaction) (uint64, error) {
	baseFee := uint64(tx.Message.Header.NumRequiredSignatures) * LamportsPerSignature

	var (
		unitLimit         *uint32
		unitPrice         uint64
		otherInstructions uint64
	)

	for i, instruction := range tx.Message.Instructions {
		programID, err := tx.Message.Program(instruction.ProgramIDIndex)
		if err != nil {
			return 0, fmt.Errorf("failed to resolve program of instruction %d: %w", i, err)
		}

		if !programID.Equals(solana.ComputeBudget) {
			otherInstructions++

			continue
		}

		accounts, err := instruction.ResolveInstructionAccounts(&tx.Message)
		if err != nil {
			return 0, fmt.Errorf("failed to resolve accounts of instruction %d: %w", i, err)
		}

		decoded, err := computebudget.DecodeInstruction(accounts, instruction.Data)
		if err != nil {
			return 0, fmt.Errorf("failed to decode compute budget instruction %d: %w", i, err)
		}

		switch impl := decoded.Impl.(type) {
		case *computebudget.SetComputeUnitLimit:
			units := impl.Units
			unitLimit = &units
		case *computebudget.SetComputeUnitPrice:
			unitPrice = impl.MicroLamports
		}
	}

	if unitPrice == 0 {
		return baseFee, nil
	}

	limit := defaultComputeUnitLimit(otherInstructions)
	if unitLimit != nil {
		limit = *unitLimit
	}

	// priority fee = ceil(unit price in micro-lamports * unit limit / 1e6)
	priorityFee := new(big.Int).Mul(new(big.Int).SetUint64(unitPrice), new(big.Int).SetUint64(uint64(limit)))
	priorityFee.Add(priorityFee, big.NewInt(microLamportsPerLamport-1))
	priorityFee.Quo(priorityFee, big.NewInt(microLamportsPerLamport))

	totalFee := priorityFee.Add(priorityFee, new(big.Int).SetUint64(baseFee))
	if !totalFee.IsUint64() {
		return 0, fmt.Errorf("transaction fee overflows uint64: %s", totalFee)
	}

	return totalFee.Uint64(), nil
}

// defaultComputeUnitLimit is the limit the runtime grants when no SetComputeUnitLimit
// is present: a fixed amount per non-ComputeBudget instruction, capped at the maximum.
func defaultComputeUnitLimit(instructionCount uint64) uint32 {
	limit := uint64(solTxSender.DefaultComputeUnitLimitPerInstruction) * instructionCount
	if limit > uint64(solTxSender.MaxComputeUnitLimit) {
		return solTxSender.MaxComputeUnitLimit
	}

	return uint32(limit)
}
