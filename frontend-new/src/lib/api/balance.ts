import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

export type BalanceToken = {
  unit: string;
  amount: string;
};

export type AddressBalanceResponse = {
  chain: string;
  address: string;
  amount: string;
  tokens: BalanceToken[];
};

export async function fetchAddressBalance(params: {
  chain: string;
  address: string;
  tokens?: string[];
}): Promise<AddressBalanceResponse> {
  const search = new URLSearchParams({
    chain: params.chain,
    address: params.address,
  });
  if (params.tokens?.length) {
    search.set("tokens", params.tokens.join(","));
  }

  const res = await fetch(`${appSettings.apiUrl}/balance?${search}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      body || `Failed to load balance for ${params.chain} (${res.status})`,
    );
  }
  return res.json() as Promise<AddressBalanceResponse>;
}

export function addressBalanceQueryOptions(params: {
  chain: string;
  address: string;
  tokens?: string[];
  phase?: "initial" | "final";
}) {
  const tokenKey = params.tokens?.slice().sort().join(",") ?? "";
  return queryOptions({
    queryKey: [
      "addressBalance",
      params.chain,
      params.address,
      tokenKey,
      params.phase ?? "initial",
    ] as const,
    queryFn: () =>
      fetchAddressBalance({
        chain: params.chain,
        address: params.address,
        tokens: params.tokens,
      }),
    enabled: Boolean(params.chain && params.address),
    // Keep the initial snapshot visible while the final refetch is in flight.
    placeholderData: keepPreviousData,
  });
}
