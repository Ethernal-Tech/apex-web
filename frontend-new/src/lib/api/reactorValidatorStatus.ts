import { queryOptions } from "@tanstack/react-query";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import { captureException } from "@/lib/wallet/errors";
import { SettingsControllerClient } from "@/swagger/apexBridgeApiService";

export const REFETCH_VSU_STATUS_MS = 30_000;

export const getReactorValidatorChangeStatusAction = () => {
  const client = new SettingsControllerClient();
  return client.getReactorValidatorChange();
};

export async function fetchReactorValidatorChangeInProgress(): Promise<boolean> {
  const validatorChangeStatusResp = await tryCatchJsonByAction(
    () => getReactorValidatorChangeStatusAction(),
    false,
  );
  if (validatorChangeStatusResp instanceof ErrorResponse) {
    console.log(
      `Error while fetching reactor validator status: ${validatorChangeStatusResp}`,
    );
    captureException(validatorChangeStatusResp, {
      tags: {
        component: "reactorValidatorStatus.ts",
        action: "fetchReactorValidatorChangeInProgress",
      },
    });

    throw new Error(validatorChangeStatusResp.err);
  }

  return validatorChangeStatusResp.inProgress;
}

export function reactorValidatorStatusQueryOptions() {
  return queryOptions({
    queryKey: ["reactorValidatorChangeStatus"] as const,
    queryFn: fetchReactorValidatorChangeInProgress,
    refetchInterval: REFETCH_VSU_STATUS_MS,
    retry: false,
  });
}
