import { ERR_CONTRACT_EXECUTION_REVERTED } from "web3";
import { formatUserError } from "@/lib/formatUserError";

/** JSON-RPC error code nodes return for `execution reverted`. */
const JSON_RPC_EXECUTION_REVERTED = 3;

// geth: "insufficient funds for gas * price + value", revm/reth: "EVM error: OutOfFunds"
const INSUFFICIENT_FUNDS_RE =
  /insufficient funds|out\s?of\s?funds|exceeds balance/i;
const REVERTED_RE = /execution reverted/i;

const MAX_DEPTH = 5;

/** Walks the web3 error chain (`cause` / `innerError` / `error`). */
function* errorChain(
  err: unknown,
  depth = 0,
): Generator<Record<string, unknown>> {
  if (typeof err !== "object" || err === null || depth > MAX_DEPTH) return;
  const rec = err as Record<string, unknown>;
  yield rec;
  yield* errorChain(rec.cause, depth + 1);
  yield* errorChain(rec.innerError, depth + 1);
  yield* errorChain(rec.error, depth + 1);
}

function matchesMessage(err: unknown, re: RegExp): boolean {
  if (typeof err === "string") return re.test(err);
  for (const e of errorChain(err)) {
    if (typeof e.message === "string" && re.test(e.message)) return true;
  }
  return false;
}

export function isInsufficientFundsError(err: unknown): boolean {
  return matchesMessage(err, INSUFFICIENT_FUNDS_RE);
}

/**
 * Errors the node will keep returning for the same tx (revert, insufficient
 * funds) - retrying them only makes the user wait.
 */
export function isDeterministicEvmError(err: unknown): boolean {
  if (isInsufficientFundsError(err) || matchesMessage(err, REVERTED_RE)) {
    return true;
  }
  for (const e of errorChain(err)) {
    if (
      e.code === ERR_CONTRACT_EXECUTION_REVERTED ||
      e.code === JSON_RPC_EXECUTION_REVERTED
    ) {
      return true;
    }
  }
  return false;
}

/** User-facing reason why the network fee could not be estimated. */
export function formatFeeEstimationError(err: unknown): string {
  if (isInsufficientFundsError(err)) {
    return "Insufficient balance to cover the amount and network fee.";
  }
  if (isDeterministicEvmError(err)) {
    return "Transaction would fail on-chain. Please check the amount and balance.";
  }
  return formatUserError(err, "Couldn't estimate the network fee.");
}
