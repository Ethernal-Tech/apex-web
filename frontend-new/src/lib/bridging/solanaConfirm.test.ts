import { describe, expect, it, vi } from "vitest";
import type { SolanaTxStatusResponse } from "@/lib/api/solana";
import {
  SOLANA_TX_EXPIRED_MESSAGE,
  solanaTxFailedMessage,
  waitForSolanaConfirmation,
} from "@/lib/bridging/solanaConfirm";

const params = {
  chain: "solana",
  signature: "sig",
  lastValidBlockHeight: "100",
};

/** fake clock: sleep advances time instantly and records the delays */
function setup(responses: Array<SolanaTxStatusResponse | Error>) {
  let time = 0;
  const delays: number[] = [];
  const fetchStatus = vi.fn(async () => {
    const next = responses.shift() ?? { status: "pending" as const };
    if (next instanceof Error) throw next;
    return next;
  });

  return {
    delays,
    fetchStatus,
    deps: {
      fetchStatus,
      sleep: async (ms: number) => {
        delays.push(ms);
        time += ms;
      },
      now: () => time,
    },
  };
}

describe("waitForSolanaConfirmation", () => {
  it("resolves on the first check when confirmed, after the first delay", async () => {
    const { deps, delays, fetchStatus } = setup([{ status: "confirmed" }]);

    await waitForSolanaConfirmation(params, deps);

    expect(delays).toEqual([2000]);
    expect(fetchStatus).toHaveBeenCalledWith(params);
  });

  it("keeps checking every 4 s while pending", async () => {
    const { deps, delays } = setup([
      { status: "pending" },
      { status: "pending" },
      { status: "confirmed" },
    ]);

    await waitForSolanaConfirmation(params, deps);

    expect(delays).toEqual([2000, 4000, 4000]);
  });

  it("throws when the tx failed", async () => {
    const { deps } = setup([{ status: "failed", err: "InstructionError" }]);

    await expect(waitForSolanaConfirmation(params, deps)).rejects.toThrow(
      solanaTxFailedMessage("InstructionError"),
    );
  });

  it("throws when the tx expired", async () => {
    const { deps } = setup([{ status: "pending" }, { status: "expired" }]);

    await expect(waitForSolanaConfirmation(params, deps)).rejects.toThrow(
      SOLANA_TX_EXPIRED_MESSAGE,
    );
  });

  it("retries after a failed status request", async () => {
    const { deps, fetchStatus } = setup([
      new Error("network"),
      { status: "confirmed" },
    ]);

    await waitForSolanaConfirmation(params, deps);

    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it("gives up without throwing when the status stays unknown", async () => {
    const { deps, delays, fetchStatus } = setup([]);

    await expect(
      waitForSolanaConfirmation(params, deps),
    ).resolves.toBeUndefined();

    // 2 s, then every 4 s up to the 120 s cap
    expect(delays.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(120_000);
    expect(fetchStatus).toHaveBeenCalledTimes(30);
  });
});
