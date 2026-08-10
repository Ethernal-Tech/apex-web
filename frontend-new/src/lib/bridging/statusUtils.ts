import { TransactionStatusEnum } from "@/swagger/apexBridgeApiService";

const STATUS_TEXT: { [key: string]: string } = {
  [TransactionStatusEnum.Pending]: "Pending",
  [TransactionStatusEnum.DiscoveredOnSource]: "Discovered on source",
  [TransactionStatusEnum.InvalidRequest]: "Invalid request",
  [TransactionStatusEnum.SubmittedToBridge]: "Submitted to bridge",
  [TransactionStatusEnum.IncludedInBatch]: "Included in batch",
  [TransactionStatusEnum.SubmittedToDestination]: "Submitted to destination",
  [TransactionStatusEnum.FailedToExecuteOnDestination]:
    "Failed to execute on destination",
  [TransactionStatusEnum.ExecutedOnDestination]: "Executed on destination",
};

const NOT_FINAL_STATES: { [key: string]: boolean } = [
  TransactionStatusEnum.Pending,
  TransactionStatusEnum.DiscoveredOnSource,
  TransactionStatusEnum.SubmittedToBridge,
  TransactionStatusEnum.IncludedInBatch,
  TransactionStatusEnum.SubmittedToDestination,
  TransactionStatusEnum.FailedToExecuteOnDestination,
].reduce((acc, cv) => ({ ...acc, [cv]: true }), {});

export type StatusKind =
  | "success"
  | "failed"
  | "pending"
  | "refunded"
  | "refunding";

export function getStatusColor(status: TransactionStatusEnum) {
  switch (status) {
    case TransactionStatusEnum.InvalidRequest:
      return "red";
    case TransactionStatusEnum.ExecutedOnDestination:
      return "green";
    default:
      return "none";
  }
}

export const getStatusIconAndLabel = (
  status: TransactionStatusEnum,
  isRefund: boolean,
): { label: string; kind: StatusKind } => {
  const finalStatuses = [
    TransactionStatusEnum.ExecutedOnDestination,
    TransactionStatusEnum.InvalidRequest,
  ];

  if (isRefund) {
    if (status === TransactionStatusEnum.ExecutedOnDestination) {
      return { label: "refunded", kind: "refunded" };
    }
    if (!finalStatuses.includes(status)) {
      return { label: "refunding", kind: "refunding" };
    }
  }

  switch (status) {
    case TransactionStatusEnum.ExecutedOnDestination:
      return { label: "success", kind: "success" };
    case TransactionStatusEnum.InvalidRequest:
      return { label: "failed", kind: "failed" };
    case TransactionStatusEnum.Pending:
    case TransactionStatusEnum.DiscoveredOnSource:
    case TransactionStatusEnum.SubmittedToBridge:
    case TransactionStatusEnum.IncludedInBatch:
    case TransactionStatusEnum.SubmittedToDestination:
    case TransactionStatusEnum.FailedToExecuteOnDestination:
      return { label: "pending", kind: "pending" };
    default:
      return { label: status, kind: "pending" };
  }
};

export function getStatusText(status: TransactionStatusEnum | string) {
  return STATUS_TEXT[status] || status;
}

export function isStatusFinal(status: TransactionStatusEnum) {
  return !NOT_FINAL_STATES[status];
}

export type SubmitLoadingState = {
  content: string;
  txHash: string | undefined;
};

export type UpdateSubmitLoadingState = {
  content?: string;
  txHash?: string;
};
