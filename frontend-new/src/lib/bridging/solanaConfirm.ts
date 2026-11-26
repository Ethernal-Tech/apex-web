import {
  fetchSolanaTxStatus,
  type SolanaTxStatusResponse,
} from "@/lib/api/solana";

// Solana usually confirms within 1-3 s, so most txs need one or two checks. Each check
// costs the backend RPC calls shared by all users, hence the sparse interval.
const FIRST_CHECK_DELAY_MS = 2_000;
const CHECK_INTERVAL_MS = 4_000;
// past blockhash expiry (~60-90 s); backend reports "expired" well before this
const MAX_WAIT_MS = 120_000;

export const SOLANA_TX_EXPIRED_MESSAGE =
  "The transaction was not executed and no funds were moved. Please try again.";

export const solanaTxFailedMessage = (err?: string) =>
  `The transaction failed on Solana and no funds were bridged${err ? `: ${err}` : "."}`;

type Deps = {
  fetchStatus: typeof fetchSolanaTxStatus;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

const defaultDeps: Deps = {
  fetchStatus: fetchSolanaTxStatus,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/**
 * Waits until a sent Solana tx is confirmed. Throws when it definitely did not go
 * through (failed or expired), so the user can retry right away. If the status stays
 * unknown (still pending, or the status endpoint keeps failing) it returns, and the
 * pending page keeps waiting for the indexer rather than inviting a duplicate send.
 */
export async function waitForSolanaConfirmation(
  params: { chain: string; signature: string; lastValidBlockHeight: string },
  deps: Deps = defaultDeps,
): Promise<void> {
  const deadline = deps.now() + MAX_WAIT_MS;
  let delay = FIRST_CHECK_DELAY_MS;

  while (deps.now() + delay <= deadline) {
    await deps.sleep(delay);
    delay = CHECK_INTERVAL_MS;

    let result: SolanaTxStatusResponse;
    try {
      result = await deps.fetchStatus(params);
    } catch (err) {
      console.log("Solana tx status check failed, retrying:", err);
      continue;
    }

    switch (result.status) {
      case "confirmed":
        return;
      case "failed":
        throw new Error(solanaTxFailedMessage(result.err));
      case "expired":
        throw new Error(SOLANA_TX_EXPIRED_MESSAGE);
    }
  }

  console.log(
    "Solana tx confirmation still unknown, leaving it to the indexer:",
    params.signature,
  );
}
