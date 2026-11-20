import { useQuery } from "@tanstack/react-query";
import { reactorValidatorStatusQueryOptions } from "@/lib/api/reactorValidatorStatus";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * The root shell polls this status, so it can land before the page hydrates;
 * reported as unknown until then for the reason given on useSettings.
 */
export function useReactorValidatorStatus(): boolean | undefined {
  const hydrated = useHydrated();
  const { data } = useQuery(reactorValidatorStatusQueryOptions());
  return hydrated ? data : undefined;
}
