import { isStatusFinal } from "@/lib/bridging/statusUtils";
import { TransactionStatusEnum } from "@/swagger/apexBridgeApiService";

export type StageStatus = "pending" | "active" | "success" | "failed";
export type DetailState = "done" | "active" | "pending" | "failed";

export type DetailStep = {
  key: string;
  title: string;
  description: string;
  state: DetailState;
};

type StatusCopy = {
  title: (source: string, dest: string) => string;
  desc: (source: string, dest: string) => string;
};

const STATUS_COPY: Record<string, StatusCopy> = {
  Pending: {
    title: (s) => `Waiting on ${s}`,
    desc: (s) =>
      `Your transfer is registered and we're waiting to see it confirmed on the ${s} chain.`,
  },
  DiscoveredOnSource: {
    title: (s) => `Detected on ${s}`,
    desc: (s) =>
      `We've spotted your transfer on the ${s} chain and are checking that everything looks right.`,
  },
  SubmittedToBridge: {
    title: () => "Handed to the Skyline bridge",
    desc: () =>
      "Your transfer has been passed to the Skyline bridge, which now takes it from here.",
  },
  IncludedInBatch: {
    title: () => "Bundled for settlement",
    desc: () =>
      "Your transfer was grouped together with others into one secure batch to keep fees low and settlement fast.",
  },
  SubmittedToDestination: {
    title: (_s, d) => `Sent to ${d}`,
    desc: (_s, d) =>
      `The bridge is now releasing your assets onto the ${d} chain.`,
  },
  ExecutedOnDestination: {
    title: (_s, d) => `Arrived on ${d}`,
    desc: (_s, d) =>
      `Your assets have landed on the ${d} chain - the transfer is complete.`,
  },
  InvalidRequest: {
    title: () => "Request couldn't be validated",
    desc: () =>
      "Some details of the transfer didn't check out, so it was stopped safely before any funds were moved.",
  },
};

/** Overrides for refund txs - late steps return funds to source, not destination. */
const REFUND_STATUS_COPY: Partial<Record<string, StatusCopy>> = {
  SubmittedToDestination: {
    title: (s) => `Returning to ${s}`,
    desc: (s) => `The bridge is now returning your assets to the ${s} chain.`,
  },
  ExecutedOnDestination: {
    title: (s) => `Refunded on ${s}`,
    desc: (s) =>
      `Your assets have been returned to the ${s} chain - the refund is complete.`,
  },
};

const HAPPY_PATH = [
  TransactionStatusEnum.DiscoveredOnSource,
  TransactionStatusEnum.SubmittedToBridge,
  TransactionStatusEnum.IncludedInBatch,
  TransactionStatusEnum.SubmittedToDestination,
  TransactionStatusEnum.ExecutedOnDestination,
] as const;

/** Coarse 3-stage loader mapping for transfer progress UI. */
export function statusToStages(status: TransactionStatusEnum): StageStatus[] {
  switch (status) {
    case TransactionStatusEnum.Pending:
    case TransactionStatusEnum.DiscoveredOnSource:
      return ["active", "pending", "pending"];
    case TransactionStatusEnum.InvalidRequest:
      return ["failed", "pending", "pending"];
    case TransactionStatusEnum.SubmittedToBridge:
    case TransactionStatusEnum.IncludedInBatch:
    case TransactionStatusEnum.FailedToExecuteOnDestination:
      // Bridge can report FailedToExecute transiently; treat as in-progress, not failed.
      return ["success", "active", "pending"];
    case TransactionStatusEnum.SubmittedToDestination:
      return ["success", "success", "active"];
    case TransactionStatusEnum.ExecutedOnDestination:
      return ["success", "success", "success"];
    default:
      return ["pending", "pending", "pending"];
  }
}

export function buildBridgingStepsFromStatus(
  status: TransactionStatusEnum,
  sourceLabel: string,
  destLabel: string,
  isRefund = false,
): DetailStep[] {
  const mk = (key: string, state: DetailState): DetailStep => {
    const copy = (isRefund ? REFUND_STATUS_COPY[key] : undefined) ??
      STATUS_COPY[key] ?? {
        title: () => key,
        desc: () => "",
      };
    return {
      key,
      state,
      title: copy.title(sourceLabel, destLabel),
      description: copy.desc(sourceLabel, destLabel),
    };
  };

  if (status === TransactionStatusEnum.InvalidRequest) {
    return [
      mk(TransactionStatusEnum.DiscoveredOnSource, "done"),
      mk(TransactionStatusEnum.InvalidRequest, "failed"),
      ...HAPPY_PATH.slice(1).map((key) => mk(key, "pending")),
    ];
  }

  if (status === TransactionStatusEnum.Pending) {
    return [
      mk(TransactionStatusEnum.Pending, "active"),
      ...HAPPY_PATH.map((key) => mk(key, "pending")),
    ];
  }

  const effectiveStatus =
    status === TransactionStatusEnum.FailedToExecuteOnDestination
      ? TransactionStatusEnum.IncludedInBatch
      : status;

  const activeIdx = HAPPY_PATH.indexOf(
    effectiveStatus as (typeof HAPPY_PATH)[number],
  );

  return HAPPY_PATH.map((key, i) => {
    if (activeIdx < 0) return mk(key, "pending");
    if (i < activeIdx) return mk(key, "done");
    if (i === activeIdx) {
      return mk(
        key,
        effectiveStatus === TransactionStatusEnum.ExecutedOnDestination
          ? "done"
          : "active",
      );
    }
    return mk(key, "pending");
  });
}

export function getOverallStatusLabel(
  status: TransactionStatusEnum,
  isRefund = false,
): string {
  if (status === TransactionStatusEnum.ExecutedOnDestination) {
    return isRefund ? "Refund Complete" : "Transfer complete";
  }
  if (status === TransactionStatusEnum.InvalidRequest) {
    return "Transfer failed";
  }
  return isRefund ? "Refund in Progress" : "Transfer in progress";
}

/** Final progress-step copy: release to destination, or return to source on refund. */
export function getReleaseStepDescription(
  sourceLabel: string,
  destLabel: string,
  isRefund: boolean,
): string {
  if (isRefund) {
    return `The assets are returned from the bridge wallet to the addresses on the ${sourceLabel} chain.`;
  }
  return `The assets go from the Bridge Wallet to the address on the ${destLabel} Chain.`;
}

export { isStatusFinal };
