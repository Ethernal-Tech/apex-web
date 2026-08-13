import { queryOptions } from "@tanstack/react-query";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import { SettingsControllerClient } from "@/swagger/apexBridgeApiService";

export async function fetchBridgingAddresses(
  chainId: string,
): Promise<string[]> {
  const client = new SettingsControllerClient();
  const response = await tryCatchJsonByAction(
    () => client.getBridgingAddresses(chainId),
    false,
  );
  if (response instanceof ErrorResponse) {
    throw new Error(response.err);
  }
  return response.addresses ?? [];
}

export function bridgingAddressesQueryOptions(chainId: string | undefined) {
  return queryOptions({
    queryKey: ["bridgingAddresses", chainId] as const,
    queryFn: () => fetchBridgingAddresses(chainId!),
    enabled: Boolean(chainId),
    staleTime: 60_000,
  });
}
