import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/** `GET /stats` — the landing page's network-wide counters. */
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
