import { captureAndThrowError } from "@/lib/wallet/errors";

export function toBytes(hex: string): Uint8Array {
  if (hex.length % 2 === 0 && /^[0-9A-F]*$/i.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  return new TextEncoder().encode(hex);
}

export const shortRetryOptions = {
  retryCnt: 10,
  waitTime: 1000,
};

export const longRetryOptions = {
  retryCnt: 20,
  waitTime: 5000,
};

export const wait = async (durationMs: number) =>
  new Promise((res) => setTimeout(res, durationMs));

export async function retryForever<T>(
  callback: () => Promise<T> | T,
  retryDelayMs = 1000,
): Promise<T> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await callback();
    } catch (e) {
      console.log("Error while retryForever", e);
      await wait(retryDelayMs);
    }
  }
}

/**
 * Retries `callback` up to `tryCount` times. Errors for which `shouldRetry`
 * returns false are rethrown immediately (e.g. deterministic EVM reverts).
 */
export async function retry<T>(
  callback: () => Promise<T> | T,
  tryCount: number,
  retryDelayMs = 1000,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  for (let i = 0; i < tryCount; ++i) {
    try {
      return await callback();
    } catch (e) {
      console.log("Error while retry", e);
      if (!shouldRetry(e)) throw e;
      await wait(retryDelayMs);
    }
  }

  captureAndThrowError(
    `failed to execute callback. tryCount: ${tryCount}`,
    "wallet/utils.ts",
    "retry",
  );
}
