import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";
import {
  setTokenInfosRegistry,
  type TokenInfosResponse,
} from "@/lib/tokenInfo";

export async function fetchTokenInfos(): Promise<TokenInfosResponse> {
  const res = await fetch(`${appSettings.apiUrl}/tokenInfo`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load token infos (${res.status})`);
  }

  const payload = (await res.json()) as TokenInfosResponse;
  setTokenInfosRegistry(payload);
  return payload;
}

export const tokenInfosQueryOptions = queryOptions({
  queryKey: ["tokenInfos"] as const,
  queryFn: fetchTokenInfos,
  staleTime: 60_000,
});
