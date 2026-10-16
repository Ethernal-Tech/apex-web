import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/** `GET /stats` - the landing page's network-wide counters. */
export type LandingStats = {
  /** Every bridging transaction the web-api has recorded. */
  bridgingTransactions: number;
};

export async function fetchLandingStats(): Promise<LandingStats> {
  const res = await fetch(`${appSettings.apiUrl}/stats`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load stats (${res.status})`);
  }
  return res.json() as Promise<LandingStats>;
}

export const landingStatsQueryOptions = queryOptions({
  queryKey: ["landingStats"] as const,
  queryFn: fetchLandingStats,
  staleTime: 60_000,
  refetchInterval: 60_000,
});

/** How long bridging takes in one direction, measured from its latest finished transactions. */
export type BridgingDuration = {
  originChain: string;
  destinationChain: string;
  medianSeconds: number;
  p90Seconds: number;
  sampleCount: number;
};

/** `GET /stats/bridgingDurations` - directions without enough recent transactions are omitted. */
export type BridgingDurations = {
  directions: BridgingDuration[];
};

export async function fetchBridgingDurations(): Promise<BridgingDurations> {
  const res = await fetch(`${appSettings.apiUrl}/stats/bridgingDurations`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load bridging durations (${res.status})`);
  }
  return res.json() as Promise<BridgingDurations>;
}

// web-api recalculates the durations every 10 minutes
export const bridgingDurationsQueryOptions = queryOptions({
  queryKey: ["bridgingDurations"] as const,
  queryFn: fetchBridgingDurations,
  staleTime: 10 * 60_000,
  retry: false,
});
