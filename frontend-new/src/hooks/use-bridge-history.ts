import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  historicalSnapshotsQueryOptions,
  type ChainTokenAmounts,
} from "@/lib/api/historicalSnapshots";
import { DFM_UNIT } from "@/lib/api/lockedTokens";
import { priceByTokenId, tokenPricesQueryOptions } from "@/lib/api/tokenPrice";
import { settingsQueryOptions } from "@/lib/api/settings";
import { getCurrencyID } from "@/lib/tokens";

export type BridgeHistoryPoint = {
  at: Date;
  tvlUsd: number;
  tvbUsd: number;
};

export type BridgeHistory = {
  /** Oldest first. Empty until at least one daily snapshot exists. */
  points: BridgeHistoryPoint[];
  isLoading: boolean;
};

/** Σ amount × USD price over a chain -> tokenID -> amount map. */
function toUsd(
  byChain: ChainTokenAmounts,
  prices: Map<number, number>,
): number {
  let usd = 0;
  for (const tokenMap of Object.values(byChain ?? {})) {
    for (const [tokenID, amount] of Object.entries(tokenMap ?? {})) {
      const price = prices.get(Number(tokenID));
      if (!price) continue;
      let value: bigint;
      try {
        value = BigInt(amount || "0");
      } catch {
        continue;
      }
      usd += (Number(value) / DFM_UNIT) * price;
    }
  }
  return usd;
}

/** UTC midnight, `days` back — stable within a day, so the query key is too. */
function utcMidnightDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

/**
 * TVL / TVB over time, from the web-api's daily snapshots.
 *
 * The snapshots hold amounts, not prices, so every point is valued at today's
 * rates — the curve tracks what the bridge held, not what it was worth on the
 * day. `useBridgeStats` is the same computation for right now.
 */
export function useBridgeHistory(days: number): BridgeHistory {
  const startDate = useMemo(() => utcMidnightDaysAgo(days), [days]);

  const { data: settings } = useQuery(settingsQueryOptions);
  const { data: prices, isPending: pricesPending } = useQuery(
    tokenPricesQueryOptions,
  );
  const { data: snapshots, isPending: snapshotsPending } = useQuery(
    historicalSnapshotsQueryOptions(startDate),
  );

  return useMemo(() => {
    const isLoading = pricesPending || snapshotsPending;
    if (!snapshots || !prices) {
      return { points: [], isLoading };
    }

    const priceMap = priceByTokenId(prices);
    // LayerZero APEX is stored on its own, priced as prime's native currency
    const apexTokenID = getCurrencyID(settings, "prime");
    const apexPrice =
      apexTokenID === undefined ? undefined : priceMap.get(apexTokenID);

    const points = snapshots.map((snapshot) => {
      let tvlUsd = toUsd(snapshot.tvlByChain, priceMap);
      if (apexPrice) {
        tvlUsd +=
          (Number(BigInt(snapshot.tvlLayerZeroApex || "0")) / DFM_UNIT) *
          apexPrice;
      }
      return {
        at: new Date(snapshot.snapshotAt),
        tvlUsd,
        tvbUsd: toUsd(snapshot.tvbByChain, priceMap),
      };
    });

    return { points, isLoading };
  }, [settings, prices, snapshots, pricesPending, snapshotsPending]);
}
