import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

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

/** Bridging modes summed into TVB, same set the old frontend asked for. */
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
