import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DFM_UNIT, lockedTokensQueryOptions } from "@/lib/api/lockedTokens";
import { priceByTokenId, tokenPricesQueryOptions } from "@/lib/api/tokenPrice";
import { settingsQueryOptions } from "@/lib/api/settings";
import { getCurrencyID } from "@/lib/tokens";
import { isUnreportedChain } from "@/lib/chains";
import appSettings from "@/settings/appSettings";

/** LayerZero balances come back in wei (18 decimals). */
const WEI_PER_DFM = BigInt(1_000_000_000_000);

const NEXUS_RPC_URLS = {
  mainnet: "https://rpc.nexus.mainnet.apexfusion.org/",
  testnet: "https://rpc.nexus.testnet.apexfusion.org",
} as const;

/**
 * Native APEX held by the Nexus OFT contract. Read straight from the chain,
 * the way the old frontend did — it is not part of `GET /lockedTokens`.
 *
 * Plain JSON-RPC rather than web3, so the landing page does not have to pull
 * the whole web3 bundle in just for a balance read.
 */
async function fetchLayerZeroLockedApexDfm(
  oftAddress: string,
): Promise<bigint> {
  const res = await fetch(
    appSettings.isMainnet ? NEXUS_RPC_URLS.mainnet : NEXUS_RPC_URLS.testnet,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [oftAddress, "latest"],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to read the Nexus OFT balance (${res.status})`);
  }

  const body = (await res.json()) as { result?: string; error?: unknown };
  if (!body.result) {
    throw new Error(`Failed to read the Nexus OFT balance`);
  }

  return BigInt(body.result) / WEI_PER_DFM;
}

function addAmount(
  totals: Map<number, bigint>,
  tokenID: number,
  amount: string | bigint,
): void {
  let value: bigint;
  try {
    value = typeof amount === "bigint" ? amount : BigInt(amount || "0");
  } catch {
    return;
  }
  totals.set(tokenID, (totals.get(tokenID) ?? BigInt(0)) + value);
}

/** Σ amount × USD price. Tokens without a cached price are skipped. */
function toUsd(
  totals: Map<number, bigint>,
  prices: Map<number, number>,
): number {
  let usd = 0;
  for (const [tokenID, amount] of totals) {
    const price = prices.get(tokenID);
    if (!price) continue;
    usd += (Number(amount) / DFM_UNIT) * price;
  }
  return usd;
}

/**
 * APEX in the Nexus OFT contract, in DFM. Shared so the audit breakdown counts
 * the same balance the TVL figure does - react-query dedupes the read.
 */
export function useLayerZeroLockedApex(): bigint | undefined {
  const { data: settings } = useQuery(settingsQueryOptions);
  const oftAddress = settings?.layerZeroChains?.find(
    (c) => c.chain === "nexus",
  )?.oftAddress;

  const { data } = useQuery({
    queryKey: ["layerZeroLockedApex", oftAddress] as const,
    queryFn: () => fetchLayerZeroLockedApexDfm(oftAddress!),
    enabled: !!oftAddress,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  return data;
}

export type BridgeStats = {
  /** Total value locked, in USD. */
  tvlUsd: number | undefined;
  /** Total value bridged, in USD. */
  tvbUsd: number | undefined;
  isLoading: boolean;
};

/**
 * TVL / TVB in USD.
 *
 * Same inputs as the old frontend — `GET /lockedTokens` plus the LayerZero
 * locked APEX read from Nexus — but instead of expressing everything in APEX,
 * every token total is multiplied by its USD price from `GET /tokenPrice` and
 * summed.
 */
export function useBridgeStats(): BridgeStats {
  const { data: settings } = useQuery(settingsQueryOptions);
  const { data: lockedTokens, isPending: lockedPending } = useQuery(
    lockedTokensQueryOptions,
  );
  const { data: prices, isPending: pricesPending } = useQuery(
    tokenPricesQueryOptions,
  );

  const layerZeroLockedApex = useLayerZeroLockedApex();

  return useMemo(() => {
    const isLoading = lockedPending || pricesPending;
    if (!lockedTokens || !prices) {
      return { tvlUsd: undefined, tvbUsd: undefined, isLoading };
    }

    const priceMap = priceByTokenId(prices);

    const lockedTotals = new Map<number, bigint>();
    for (const [chain, tokenMap] of Object.entries(lockedTokens.chains ?? {})) {
      if (isUnreportedChain(chain)) continue;
      for (const [tokenID, addressMap] of Object.entries(tokenMap ?? {})) {
        for (const amount of Object.values(addressMap ?? {})) {
          addAmount(lockedTotals, Number(tokenID), amount);
        }
      }
    }

    // APEX locked in the Nexus OFT contract is priced as prime's native currency
    const apexTokenID = settings ? getCurrencyID(settings, "prime") : undefined;
    if (layerZeroLockedApex && apexTokenID !== undefined) {
      addAmount(lockedTotals, apexTokenID, layerZeroLockedApex);
    }

    const bridgedTotals = new Map<number, bigint>();
    for (const [chain, tokenMap] of Object.entries(
      lockedTokens.totalTransferred ?? {},
    )) {
      if (isUnreportedChain(chain)) continue;
      for (const [tokenID, amount] of Object.entries(tokenMap ?? {})) {
        addAmount(bridgedTotals, Number(tokenID), amount);
      }
    }

    return {
      tvlUsd: toUsd(lockedTotals, priceMap),
      tvbUsd: toUsd(bridgedTotals, priceMap),
      isLoading,
    };
  }, [
    settings,
    lockedTokens,
    prices,
    layerZeroLockedApex,
    lockedPending,
    pricesPending,
  ]);
}
