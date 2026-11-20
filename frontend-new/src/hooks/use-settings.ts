import { useQuery } from "@tanstack/react-query";

import {
  settingsQueryOptions,
  type SettingsResponse,
} from "@/lib/api/settings";
import { useHydrated } from "@/hooks/use-hydrated";

export type Settings = {
  data: SettingsResponse | undefined;
  isPending: boolean;
};

/**
 * `GET /settings`. Read it through this hook, never `useQuery(settingsQueryOptions)`.
 *
 * The root shell (WalletSessionProvider) queries settings, and it hydrates and
 * runs its effects before the route content inside the router's Suspense
 * boundary does. If the response lands in between, a plain `useQuery` in the
 * page would hydrate with data the prerendered HTML does not have, and React
 * throws the page away and renders it again on the client. Until hydration is
 * done this reports the settings as still loading - exactly what was prerendered.
 */
export function useSettings(): Settings {
  const hydrated = useHydrated();
  const { data, isPending } = useQuery(settingsQueryOptions);

  if (!hydrated) return { data: undefined, isPending: true };
  return { data, isPending };
}
