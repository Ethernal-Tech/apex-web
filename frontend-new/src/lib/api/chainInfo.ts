import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";
import {
  setChainInfosRegistry,
  type ChainInfo,
  type ChainInfosResponse,
} from "@/lib/chains";

/**
 * `GET /chainInfo` - how each chain is presented: accent color, name, logo, list
 * order, family and native symbol. The web-api reads it from a config file it
 * re-checks on every request, so all of that can change without a frontend
 * deploy. The payload shape lives in lib/chains.ts, next to the fallbacks that
 * fill in whatever the config leaves out.
 */
export type { ChainInfo, ChainInfosResponse };

export async function fetchChainInfos(): Promise<ChainInfosResponse> {
  const res = await fetch(`${appSettings.apiUrl}/chainInfo`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load chain infos (${res.status})`);
  }

  const payload = (await res.json()) as ChainInfosResponse;
  // keeps getChainMeta/getSrcChains working outside React - see lib/chains.ts
  setChainInfosRegistry(payload);
  return payload;
}

export const chainInfosQueryOptions = queryOptions({
  queryKey: ["chainInfos"] as const,
  queryFn: fetchChainInfos,
  // cosmetic metadata that changes only when someone edits the config file
  staleTime: 5 * 60_000,
});
