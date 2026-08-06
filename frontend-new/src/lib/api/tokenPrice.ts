import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/**
 * `GET /tokenPrice` — one entry per bridge token ID, so a price can be joined
 * straight onto amounts keyed by token ID. Representations of the same asset
 * repeat the price under their own ID (ADA and xADA are both priced as ADA).
 */
export type TokenPrice = {
  id?: number;
  name: string;
  symbol: string;
  chains: string[];
  priceUsd: number;
  source: string;
  fetchedAt: string;
  stale: boolean;
};

export async function fetchTokenPrices(): Promise<TokenPrice[]> {
  const res = await fetch(`${appSettings.apiUrl}/tokenPrice`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load token prices (${res.status})`);
  }
  return res.json() as Promise<TokenPrice[]>;
}

export const tokenPricesQueryOptions = queryOptions({
  queryKey: ["tokenPrices"] as const,
  queryFn: fetchTokenPrices,
  // the web-api refreshes the cached prices every 10 minutes
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
});

/** tokenID -> USD price, for tokens the price cron knows about. */
export function priceByTokenId(
  prices: TokenPrice[] | undefined,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const price of prices ?? []) {
    if (price.id === undefined || price.id === null) continue;
    map.set(price.id, price.priceUsd);
  }
  return map;
}
