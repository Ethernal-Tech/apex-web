import { useQuery } from "@tanstack/react-query";
import { reactorValidatorStatusQueryOptions } from "@/lib/api/reactorValidatorStatus";

export function useReactorValidatorStatus(): boolean | undefined {
  const { data } = useQuery(reactorValidatorStatusQueryOptions());
  return data;
}
