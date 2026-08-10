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
