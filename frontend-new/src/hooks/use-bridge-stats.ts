import { useQuery } from "@tanstack/react-query";

import { lockedTokensSummaryQueryOptions } from "@/lib/api/lockedTokens";
import { settingsQueryOptions } from "@/lib/api/settings";
import appSettings from "@/settings/appSettings";

/** LayerZero balances come back in wei (18 decimals). */
const WEI_PER_DFM = BigInt(1_000_000_000_000);

const NEXUS_RPC_URLS = {
  mainnet: "https://rpc.nexus.mainnet.apexfusion.org/",
  testnet: "https://rpc.nexus.testnet.apexfusion.org",
} as const;

/**
 * Native APEX held by the Nexus OFT contract. Read straight from the chain —
 * it is not part of `GET /lockedTokens`.
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

/**
 * APEX in the Nexus OFT contract, in DFM. The audit breakdown adds it to the
 * chain balances the way the web-api adds it to the TVL it serves.
 */
export function useLayerZeroLockedApex(): bigint | undefined {
  const { data: settings } = useQuery(settingsQueryOptions);
  const oftAddress = settings?.layerZeroChains?.nexus?.oftAddress;

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
 * TVL / TVB in USD, from `GET /lockedTokens/summary`.
 *
 * Summed and priced by the web-api rather than here: deriving them needs the
 * whole locked tokens payload, every token price and the Nexus OFT balance, and
 * waiting on all three left the header on "—" for seconds. The web-api keeps
 * the figures cached and recomputes them whenever `/lockedTokens` is queried,
 * so this is a single fast request.
 */
export function useBridgeStats(): BridgeStats {
  const { data, isPending } = useQuery(lockedTokensSummaryQueryOptions);

  return {
    tvlUsd: data?.tvlUsd,
    tvbUsd: data?.tvbUsd,
    isLoading: isPending,
  };
}
