import { describe, expect, it } from "vitest";
import { ContractExecutionError, ResponseError } from "web3";
import {
  formatFeeEstimationError,
  isDeterministicEvmError,
  isInsufficientFundsError,
} from "@/lib/wallet/evmErrors";

const rpcError = (code: number, message: string) =>
  new ResponseError({ jsonrpc: "2.0", id: 1, error: { code, message } });

describe("evmErrors", () => {
  it("detects revm OutOfFunds as insufficient funds", () => {
    const err = rpcError(-32003, "EVM error: OutOfFunds");
    expect(isInsufficientFundsError(err)).toBe(true);
    expect(isDeterministicEvmError(err)).toBe(true);
    expect(formatFeeEstimationError(err)).toBe(
      "Insufficient balance to cover the amount and network fee.",
    );
  });

  it("detects geth insufficient funds", () => {
    const err = rpcError(
      -32000,
      "insufficient funds for gas * price + value: have 1 want 2",
    );
    expect(isDeterministicEvmError(err)).toBe(true);
  });

  it("detects contract reverts", () => {
    const err = new ContractExecutionError({
      code: 3,
      message: "execution reverted: custom error",
    });
    expect(isInsufficientFundsError(err)).toBe(false);
    expect(isDeterministicEvmError(err)).toBe(true);
  });

  it("treats network failures as retryable", () => {
    expect(isDeterministicEvmError(new Error("Failed to fetch"))).toBe(false);
    expect(isDeterministicEvmError(rpcError(-32603, "internal error"))).toBe(
      false,
    );
  });
});
