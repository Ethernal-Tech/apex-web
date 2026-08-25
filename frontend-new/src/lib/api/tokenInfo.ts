import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

/**
 * `GET /tokenInfo` - how a bridge token is presented, per token ID. The web-api
 * reads it from a config file it re-checks on every request, so a label, icon
 * or color can change without a frontend deploy.
 */
export type TokenInfo = {
  tokenID: number;
  label: string;
  /** Key of a bundled icon asset (apex, eth, polygon, sei, solana, unknown). */
  icon: string;
  /** Hosted image to use instead of the bundled asset, when the config sets one. */
  iconUrl?: string;
  /** Accent hex color for legend dots and chart series; absent when unset. */
  color?: string;
};

export type TokenInfosResponse = {
  network: "mainnet" | "testnet";
  tokens: TokenInfo[];
  /** Served for any token ID the config does not list. */
  unknownToken: TokenInfo;
};

export async function fetchTokenInfos(): Promise<TokenInfosResponse> {
  const res = await fetch(`${appSettings.apiUrl}/tokenInfo`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load token infos (${res.status})`);
  }
  return res.json() as Promise<TokenInfosResponse>;
}

export const tokenInfosQueryOptions = queryOptions({
  queryKey: ["tokenInfos"] as const,
  queryFn: fetchTokenInfos,
  // cosmetic metadata that changes only when someone edits the config file
  staleTime: 5 * 60_000,
});
