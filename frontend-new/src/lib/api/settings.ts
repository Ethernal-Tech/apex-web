import { queryOptions } from "@tanstack/react-query";
import appSettings from "@/settings/appSettings";

export type DirectionConfigEntry = {
  destChain: Record<string, Array<{ srcTokenID: number; dstTokenID: number }>>;
  tokens: Record<
    string,
    {
      chainSpecific: string;
      lockUnlock: boolean;
      isWrappedCurrency: boolean;
    }
  >;
};

/** Subset of web-api `GET /settings` used by the app. */
export type SettingsResponse = {
  enabledChains: string[];
  ecosystemTokens: Array<{ id: number; name: string }>;
  directionConfig: Record<string, DirectionConfigEntry>;
};

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch(`${appSettings.apiUrl}/settings`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load settings (${res.status})`);
  }
  return res.json() as Promise<SettingsResponse>;
}

export const settingsQueryOptions = queryOptions({
  queryKey: ["settings"] as const,
  queryFn: fetchSettings,
  staleTime: 60_000,
});
