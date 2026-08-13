import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/** chain -> tokenID -> amount, in DFM (6 decimals). */
export type ChainTokenAmounts = Record<string, Record<string, string>>;

/**
 * `GET /lockedTokens/historical` — one row per daily UTC-midnight snapshot of
 * what the bridge held and had moved, ordered by `snapshotAt` ascending.
 *
 * Amounts only: the web-api stores no historical prices, so a USD series built
 * from these is "past amounts at today's rates".
 */
export type HistoricalSnapshot = {
  snapshotAt: string;
  tvlByChain: ChainTokenAmounts;
  /** APEX in the LayerZero OFT contract, kept out of `tvlByChain`. */
  tvlLayerZeroApex: string;
  tvbByChain: ChainTokenAmounts;
};

export async function fetchHistoricalSnapshots(
  startDate?: string,
): Promise<HistoricalSnapshot[]> {
  const query = startDate
    ? `?startDate=${encodeURIComponent(startDate)}`
    : // no startDate means "since the earliest snapshot"
      "";
  const res = await fetch(
    `${appSettings.apiUrl}/lockedTokens/historical${query}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load historical snapshots (${res.status})`);
  }
  return res.json() as Promise<HistoricalSnapshot[]>;
}

export const historicalSnapshotsQueryOptions = (startDate?: string) =>
  queryOptions({
    queryKey: ["historicalSnapshots", startDate ?? "all"] as const,
    queryFn: () => fetchHistoricalSnapshots(startDate),
    // one new row a day, so there is nothing to gain from refetching often
    staleTime: 10 * 60_000,
  });
