import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/**
 * `GET /chainInfo` — the accent color of each chain, per chain id. The web-api
 * reads it from a config file it re-checks on every request, so the palette can
 * change without a frontend deploy.
 */
export type ChainInfo = {
  /** Chain id as `enabledChains` spells it, lowercase. */
  chain: string;
  color: string;
};

export type ChainInfosResponse = {
  network: "mainnet" | "testnet";
  chains: ChainInfo[];
  /** Served for a chain the config does not list, when it sets one. */
  unknownChain?: ChainInfo;
};

export async function fetchChainInfos(): Promise<ChainInfosResponse> {
  const res = await fetch(`${appSettings.apiUrl}/chainInfo`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load chain infos (${res.status})`);
  }
  return res.json() as Promise<ChainInfosResponse>;
}

export const chainInfosQueryOptions = queryOptions({
  queryKey: ["chainInfos"] as const,
  queryFn: fetchChainInfos,
  // cosmetic metadata that changes only when someone edits the config file
  staleTime: 5 * 60_000,
});
