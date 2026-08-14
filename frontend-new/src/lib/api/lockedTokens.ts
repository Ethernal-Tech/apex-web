import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/** Every amount the web-api serves is in DFM — 6 decimals. */
export const DFM_UNIT = 1_000_000;

/**
 * `GET /lockedTokens` — amounts are strings in DFM (6 decimals) for every
 * chain, the web-api normalises EVM wei before serving them.
 */
export type LockedTokensResponse = {
  /** chain -> tokenID -> bridging address -> locked amount */
  chains: Record<string, Record<string, Record<string, string>>>;
  /** chain -> tokenID -> total bridged out of that chain */
  totalTransferred: Record<string, Record<string, string>>;
};

/** Bridging modes included when summing TVB from `GET /lockedTokens`. */
const ALLOWED_BRIDGING_MODES = ["skyline", "layerzero"] as const;

export async function fetchLockedTokens(): Promise<LockedTokensResponse> {
  const res = await fetch(
    `${appSettings.apiUrl}/lockedTokens?allowedBridgingModes=${ALLOWED_BRIDGING_MODES.join(",")}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load locked tokens (${res.status})`);
  }
  return res.json() as Promise<LockedTokensResponse>;
}

export const lockedTokensQueryOptions = queryOptions({
  queryKey: ["lockedTokens"] as const,
  queryFn: fetchLockedTokens,
  staleTime: 60_000,
  refetchInterval: 60_000,
});

/**
 * `GET /lockedTokens/summary` — TVL and TVB already summed and priced, in USD.
 *
 * The full `/lockedTokens` payload takes seconds to produce (an external API
 * call, DB aggregates and a balance read per chain), so the headline figures
 * are computed and cached by the web-api instead of being re-derived here.
 */
export type LockedTokensSummary = {
  tvlUsd: number;
  tvbUsd: number;
  /** ISO 8601, when the web-api last recomputed the figures. */
  computedAt: string;
};

export async function fetchLockedTokensSummary(): Promise<LockedTokensSummary> {
  const res = await fetch(
    `${appSettings.apiUrl}/lockedTokens/summary?allowedBridgingModes=${ALLOWED_BRIDGING_MODES.join(",")}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load the locked tokens summary (${res.status})`);
  }
  return res.json() as Promise<LockedTokensSummary>;
}

export const lockedTokensSummaryQueryOptions = queryOptions({
  queryKey: ["lockedTokensSummary"] as const,
  queryFn: fetchLockedTokensSummary,
  staleTime: 60_000,
  refetchInterval: 60_000,
});
