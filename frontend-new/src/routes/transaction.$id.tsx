import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Copy,
  X as XIcon,
  Wallet,
  ExternalLink,
  History,
  ChevronDown,
  Loader2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkBadge } from "@/components/NetworkToggle";
import { BridgeHeader } from "@/components/BridgeHeader";
import { convertDfmToApex, toFixedAmount } from "@/lib/amount";
import { settingsQueryOptions } from "@/lib/api/settings";
import { tokenInfosQueryOptions } from "@/lib/api/tokenInfos";
import { getAction } from "@/lib/api/transaction";
import {
  buildBridgingStepsFromStatus,
  getOverallStatusLabel,
  getReleaseStepDescription,
  isStatusFinal,
  statusToStages,
  type DetailState,
  type DetailStep,
  type StageStatus,
} from "@/lib/bridging/txStatusUi";
import { CHAIN_META } from "@/lib/chains";
import { getExplorerUrl, openExplorer } from "@/lib/explorer";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import {
  getCurrencyID,
  getRealTokenIDFromEntity,
  getTokenDisplayName,
} from "@/lib/tokens";
import {
  TransactionStatusEnum,
  type BridgeTransactionDto,
} from "@/swagger/apexBridgeApiService";
import { useLiveTxBalances } from "@/hooks/use-live-tx-balances";
import { parseReturnTo, readReturnTo } from "@/lib/returnTo";

export const Route = createFileRoute("/transaction/$id")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => {
    const returnTo = readReturnTo(search);
    return returnTo ? { returnTo } : {};
  },
  head: () => ({
    meta: [
      { title: "Skyline Bridge — Transaction" },
      {
        name: "description",
        content: "Track your Skyline bridging transaction across chains.",
      },
    ],
  }),
  component: TransactionPage,
});

const STAGE_LABELS = [
  {
    title: "Source lock",
    describe: (src: string) =>
      `Your address on the ${src} Chain sends assets to the Bridge Wallet.`,
  },
  {
    title: "Bridge relay",
    describe: () =>
      "There is a blockchain of the bridge that facilitates the transaction.",
  },
  {
    title: "Destination release",
    describe: (_src: string, dst: string) =>
      `The assets go from the Bridge Wallet to the address on the ${dst} Chain.`,
  },
] as const;

function StepIcon({
  state,
  refundDone,
}: {
  state: DetailState;
  refundDone?: boolean;
}) {
  if (state === "done") {
    if (refundDone) {
      return (
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.78_0.14_85)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.78_0.14_85_/_0.3)]">
          <Undo2 className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      );
    }
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.7_0.18_165)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.7_0.18_165_/_0.3)]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[oklch(0.62_0.22_25)] text-white ring-2 ring-[oklch(0.62_0.22_25_/_0.3)]">
        <XIcon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[oklch(0.83_0.15_85_/_0.25)] border-t-[oklch(0.83_0.15_85)]" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-white/5" />
    </span>
  );
}

function BridgingDetail({
  steps,
  isRefund,
}: {
  steps: DetailStep[];
  isRefund: boolean;
}) {
  return (
    <ol className="mt-4 grid gap-3 border-t border-white/5 pt-4">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-start gap-3">
          <StepIcon state={s.state} refundDone={isRefund && i > 0} />
          <div className="min-w-0">
            <div
              className={`text-sm font-medium leading-tight ${
                s.state === "pending"
                  ? "text-muted-foreground"
                  : "text-foreground"
              } ${s.state === "failed" ? "text-[oklch(0.85_0.19_25)]" : ""}`}
            >
              {s.title}
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {s.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function chainView(chainId: string | undefined) {
  const meta = chainId ? CHAIN_META[chainId] : undefined;
  return {
    id: chainId ?? "",
    label: meta?.label ?? chainId ?? "—",
    icon: meta?.icon ?? CHAIN_META.prime.icon,
    symbol: meta?.symbol ?? "TOKEN",
  };
}

function TransactionPage() {
  const { id } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const backTo = parseReturnTo(returnTo);
  const [showDetails, setShowDetails] = useState(false);

  const txId = Number.parseInt(id, 10);
  const settingsQuery = useQuery(settingsQueryOptions);
  useQuery(tokenInfosQueryOptions);

  const txQuery = useQuery({
    queryKey: ["bridgeTransaction", txId] as const,
    enabled: Number.isFinite(txId),
    queryFn: async (): Promise<BridgeTransactionDto> => {
      const response = await tryCatchJsonByAction(
        getAction.bind(null, txId),
        false,
      );
      if (response instanceof ErrorResponse) {
        throw new Error(response.err);
      }
      return response;
    },
    refetchInterval: (query) => {
      const tx = query.state.data;
      if (!tx || isStatusFinal(tx.status)) return false;
      return 5000;
    },
  });

  const tx = txQuery.data;
  const settings = settingsQuery.data;

  const source = chainView(tx?.originChain);
  const destination = chainView(tx?.destinationChain);

  const amountDisplay = useMemo(() => {
    if (!tx) return "0";
    return toFixedAmount(convertDfmToApex(tx.amount, tx.originChain), 6);
  }, [tx]);

  const tokenAmountDisplay = useMemo(() => {
    if (!tx?.nativeTokenAmount) return null;
    if (BigInt(tx.nativeTokenAmount || "0") === BigInt(0)) return null;
    return toFixedAmount(
      convertDfmToApex(tx.nativeTokenAmount, tx.originChain),
      6,
    );
  }, [tx]);

  const currencyID =
    tx && settings ? getCurrencyID(settings, tx.originChain) : undefined;
  const currencySymbol =
    getTokenDisplayName(settings, currencyID) || source.symbol;

  const realTokenID = settings
    ? getRealTokenIDFromEntity(settings, tx)
    : undefined;
  const tokenSymbol = getTokenDisplayName(settings, realTokenID);

  const sender = tx?.senderAddress ?? "";
  const receiver = tx?.receiverAddresses ?? "";
  const startedAt = tx?.createdAt ?? null;
  const finishedAt = tx?.finishedAt ?? null;

  const rawStatus = tx?.status ?? TransactionStatusEnum.Pending;
  const isRefund = !!tx?.isRefund;

  const [statusToShow, setStatusToShow] = useState(rawStatus);
  useEffect(() => {
    setStatusToShow(rawStatus);
  }, [txId]);
  useEffect(() => {
    setStatusToShow((prev) => {
      if (
        prev === TransactionStatusEnum.SubmittedToDestination &&
        (rawStatus === TransactionStatusEnum.IncludedInBatch ||
          rawStatus === TransactionStatusEnum.FailedToExecuteOnDestination)
      ) {
        return prev;
      }
      return rawStatus;
    });
  }, [rawStatus]);

  const stages = statusToStages(statusToShow);
  const detailSteps = buildBridgingStepsFromStatus(
    statusToShow,
    source.label,
    destination.label,
    isRefund,
  );
  const overallDone =
    statusToShow === TransactionStatusEnum.ExecutedOnDestination;
  const overallFailed = statusToShow === TransactionStatusEnum.InvalidRequest;
  // Refund styling for in-progress/complete refunds; failed invalid-request keeps error styling.
  const showAsRefund = isRefund && !overallFailed;
  const statusLabel = getOverallStatusLabel(statusToShow, isRefund);
  const showFinalDetails = !!tx && isStatusFinal(rawStatus);
  // Keep balances visible after finalization if the user watched this tx
  // while it was still in progress (so the destination bump stays on screen).
  // Opening an already-final tx from history does not show balances.
  const [shouldTrackBalances, setShouldTrackBalances] = useState(false);
  useEffect(() => {
    setShouldTrackBalances(false);
  }, [txId]);
  useEffect(() => {
    if (tx && !isStatusFinal(rawStatus)) {
      setShouldTrackBalances(true);
    }
  }, [tx, rawStatus]);

  const liveBalances = useLiveTxBalances({
    tx,
    settings,
    sourceLabel: source.label,
    destinationLabel: destination.label,
    isFinal: !!tx && isStatusFinal(rawStatus),
    shouldTrackBalances,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BridgeHeader>
        {sender && (
          <div className="btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold">
            <Wallet className="h-4 w-4" />
            {shortAddr(sender)}
          </div>
        )}
      </BridgeHeader>

      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="container-page relative py-6 md:py-8">
          <div className="mx-auto max-w-5xl">
            <DetailReturnLink className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {backTo.to === "/transactions"
                ? "Back to history"
                : "Back to bridge"}
            </DetailReturnLink>

            <div className="card-glow relative mt-4 animate-bridge-step-in rounded-3xl p-5 md:p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              {txQuery.isLoading && (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading transaction…</p>
                </div>
              )}

              {txQuery.isError && (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                  <AlertCircle className="h-8 w-8 text-[oklch(0.78_0.19_25)]" />
                  <p className="text-sm text-foreground">
                    Couldn&apos;t load transaction #{id}
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    {txQuery.error instanceof Error
                      ? txQuery.error.message
                      : "Unknown error"}
                  </p>
                </div>
              )}

              {tx && (
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="relative grid content-start gap-4">
                    <div
                      key={showFinalDetails ? "details" : "summary"}
                      className="animate-panel-swap grid content-start gap-4"
                    >
                      {showFinalDetails ? (
                        <TransactionDetails
                          source={source.label}
                          destination={destination.label}
                          amount={amountDisplay}
                          symbol={currencySymbol}
                          tokenAmount={tokenAmountDisplay}
                          tokenSymbol={tokenSymbol}
                          sender={sender}
                          receiver={receiver}
                          started={startedAt ?? new Date()}
                          finished={finishedAt ?? new Date()}
                          failed={overallFailed}
                          isRefund={isRefund}
                          statusLabel={statusLabel}
                        />
                      ) : (
                        <>
                          <ChainSummary label="Source" chain={source} />
                          <ChainSummary
                            label="Destination"
                            chain={destination}
                          />
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Amount
                            </div>
                            <div className="mt-1 font-display text-2xl font-semibold text-foreground">
                              {amountDisplay}{" "}
                              <span className="text-sm font-medium text-muted-foreground">
                                {currencySymbol}
                              </span>
                            </div>
                            {tokenAmountDisplay && (
                              <>
                                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Token amount
                                </div>
                                <div className="mt-1 font-display text-xl font-semibold text-foreground">
                                  {tokenAmountDisplay}{" "}
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {tokenSymbol}
                                  </span>
                                </div>
                              </>
                            )}
                            {tx.sourceTxHash && (
                              <div className="mt-3 border-t border-white/5 pt-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Source tx
                                </div>
                                <div className="mt-1 break-all font-mono text-xs text-foreground">
                                  {tx.sourceTxHash}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative flex flex-col rounded-2xl border border-white/10 bg-[oklch(0.14_0.03_260_/_0.5)] p-5 md:p-6">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
                          overallFailed
                            ? "text-[oklch(0.78_0.19_25)]"
                            : showAsRefund
                              ? "text-[oklch(0.88_0.12_85)]"
                              : overallDone
                                ? "text-[oklch(0.85_0.15_165)]"
                                : "text-[oklch(0.85_0.15_235)]"
                        }`}
                      >
                        {showAsRefund && (
                          <Undo2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                        {statusLabel}
                      </span>
                      {!overallDone && !overallFailed && <SmallSpinner />}
                    </div>

                    <div className="mt-6 grid grid-cols-3 items-start gap-2">
                      {stages.map((stageStatus, i) => (
                        <StageColumn
                          key={i}
                          index={i}
                          status={stageStatus}
                          title={STAGE_LABELS[i].title}
                          isRefund={isRefund}
                          chainIcon={
                            i === 0
                              ? source.icon
                              : i === 2
                                ? isRefund
                                  ? source.icon
                                  : destination.icon
                                : undefined
                          }
                          chainLabel={
                            i === 0
                              ? source.label
                              : i === 2
                                ? isRefund
                                  ? source.label
                                  : destination.label
                                : "Bridge"
                          }
                          description={
                            i === 2
                              ? getReleaseStepDescription(
                                  source.label,
                                  destination.label,
                                  isRefund,
                                )
                              : STAGE_LABELS[i].describe(
                                  source.label,
                                  destination.label,
                                )
                          }
                        />
                      ))}
                    </div>

                    {(liveBalances.source || liveBalances.destination) && (
                      <div className="mt-6 grid gap-2 border-t border-white/5 pt-4 sm:grid-cols-2">
                        {liveBalances.source && (
                          <LiveBalanceCard
                            title="Source wallet"
                            balance={liveBalances.source}
                          />
                        )}
                        {liveBalances.destination && (
                          <LiveBalanceCard
                            title="Destination wallet"
                            balance={liveBalances.destination}
                          />
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowDetails((v) => !v)}
                      aria-expanded={showDetails}
                      className="mt-6 inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showDetails
                        ? "Hide detailed status"
                        : "View detailed status"}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showDetails && (
                      <BridgingDetail steps={detailSteps} isRefund={isRefund} />
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-8">
                      <Link
                        to="/transactions"
                        className="btn-primary-glow inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em]"
                      >
                        <History className="h-3.5 w-3.5 shrink-0" /> Bridging
                        history
                      </Link>
                      <button
                        type="button"
                        disabled={!getExplorerUrl(tx)}
                        onClick={() => openExplorer(tx)}
                        className="btn-primary-glow inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] disabled:opacity-40"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" /> View
                        Explorer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-background">
        <div className="flex w-full flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground md:flex-row md:gap-2 md:px-6 lg:px-8">
          <div className="order-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:order-1 md:flex-1 md:justify-start">
            <span>
              © {new Date().getFullYear()} Skyline. All rights reserved.
            </span>
            <FooterLegal />
          </div>
          <FooterSocials className="order-2 md:flex-1 md:justify-center" />
          <div className="order-1 flex items-center gap-2 md:order-3 md:flex-1 md:justify-end">
            <span className="text-muted-foreground/70">Network:</span>
            <NetworkBadge className="inline-flex" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function ChainSummary({
  label,
  chain,
}: {
  label: string;
  chain: { label: string; icon: string; symbol: string };
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <img
          src={chain.icon}
          alt={chain.label}
          className="h-9 w-9 rounded-full"
        />
        <div className="flex flex-col">
          <span className="font-medium text-foreground leading-tight">
            {chain.label}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {chain.symbol}
          </span>
        </div>
      </div>
    </div>
  );
}

function LiveBalanceCard({
  title,
  balance,
}: {
  title: string;
  balance: {
    chainLabel: string;
    address: string;
    symbol: string;
    amountDisplay: string | null;
    isLoading: boolean;
    isError: boolean;
  };
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {balance.chainLabel} ·{" "}
        <span className="font-mono">{shortAddr(balance.address)}</span>
      </div>
      <div className="mt-2 font-display text-lg font-semibold text-foreground">
        {balance.isError
          ? "—"
          : balance.amountDisplay != null
            ? `${balance.amountDisplay} ${balance.symbol}`
            : balance.isLoading
              ? "Loading…"
              : "—"}
      </div>
    </div>
  );
}

function StageColumn({
  index,
  status,
  title,
  chainIcon,
  chainLabel,
  description,
  isRefund,
}: {
  index: number;
  status: StageStatus;
  title: string;
  chainIcon?: string;
  chainLabel: string;
  description: string;
  isRefund: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <StageOrb
        index={index}
        status={status}
        chainIcon={chainIcon}
        chainLabel={chainLabel}
        isRefund={isRefund}
      />
      <StatusBadge
        status={status}
        index={index}
        refundDone={isRefund && index > 0}
      />
      <div className="mt-3 font-display text-sm font-semibold text-foreground">
        {title}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StageOrb({
  index,
  status,
  chainIcon,
  chainLabel,
  isRefund,
}: {
  index: number;
  status: StageStatus;
  chainIcon?: string;
  chainLabel: string;
  isRefund: boolean;
}) {
  const active = status === "active";
  const failed = status === "failed";
  const done = status === "success";
  const refundDone = isRefund && done && index > 0;
  const doneGlow = refundDone
    ? "bg-[oklch(0.78_0.14_85_/_0.28)]"
    : "bg-[oklch(0.7_0.18_165_/_0.28)]";
  const doneBorder = refundDone
    ? "border-[oklch(0.78_0.14_85_/_0.55)]"
    : "border-[oklch(0.7_0.18_165_/_0.55)]";
  const doneFill = refundDone
    ? "bg-[oklch(0.78_0.14_85_/_0.35)]"
    : "bg-[oklch(0.7_0.18_165_/_0.35)]";

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {active && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-[oklch(0.72_0.19_245_/_0.35)] blur-xl" />
      )}
      {failed && (
        <div className="absolute inset-0 rounded-full bg-[oklch(0.62_0.22_25_/_0.35)] blur-xl" />
      )}
      {done && (
        <div className={`absolute inset-0 rounded-full ${doneGlow} blur-xl`} />
      )}

      {index === 1 ? (
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border ${
            active
              ? "border-[oklch(0.72_0.19_245_/_0.6)]"
              : failed
                ? "border-[oklch(0.62_0.22_25_/_0.6)]"
                : done
                  ? doneBorder
                  : "border-white/10"
          } bg-white/[0.03]`}
        >
          <div
            className={`h-9 w-9 rounded-full ${
              active
                ? "animate-spin border-[3px] border-white/10 border-r-[oklch(0.72_0.19_245)] border-t-[oklch(0.85_0.15_235)]"
                : failed
                  ? "bg-[oklch(0.62_0.22_25_/_0.4)]"
                  : done
                    ? doneFill
                    : "bg-white/5"
            }`}
          />
        </div>
      ) : (
        <div
          className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border ${
            active
              ? "border-[oklch(0.72_0.19_245_/_0.6)]"
              : failed
                ? "border-[oklch(0.62_0.22_25_/_0.6)]"
                : done
                  ? doneBorder
                  : "border-white/10"
          } bg-white/[0.03]`}
        >
          {chainIcon ? (
            <img
              src={chainIcon}
              alt={chainLabel}
              className={`h-full w-full rounded-full ${status === "pending" ? "opacity-50 grayscale" : ""}`}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  index,
  refundDone,
}: {
  status: StageStatus;
  index: number;
  refundDone?: boolean;
}) {
  if (status === "success") {
    if (refundDone) {
      return (
        <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.78_0.14_85)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.78_0.14_85_/_0.3)]">
          <Undo2 className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      );
    }
    return (
      <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.7_0.18_165)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.7_0.18_165_/_0.3)]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(0.62_0.22_25)] text-white ring-2 ring-[oklch(0.62_0.22_25_/_0.3)]">
        <XIcon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-[oklch(0.72_0.19_245_/_0.6)] bg-[oklch(0.72_0.19_245_/_0.15)] px-2 text-[10px] font-semibold text-[oklch(0.85_0.15_235)]">
        {index + 1}
      </span>
    );
  }
  return (
    <span className="mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-2 text-[10px] font-semibold text-muted-foreground">
      {index + 1}
    </span>
  );
}

function SmallSpinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/10 border-t-[oklch(0.85_0.15_235)]" />
  );
}

function TransactionDetails({
  source,
  destination,
  amount,
  symbol,
  tokenAmount,
  tokenSymbol,
  sender,
  receiver,
  started,
  finished,
  failed,
  isRefund,
  statusLabel,
}: {
  source: string;
  destination: string;
  amount: string;
  symbol: string;
  tokenAmount: string | null;
  tokenSymbol: string;
  sender: string;
  receiver: string;
  started: Date;
  finished: Date;
  failed: boolean;
  isRefund: boolean;
  statusLabel: string;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Transaction Details
      </h2>
      <div className="mt-4 flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02]">
        <DetailRow label="Source chain" value={source} />
        <DetailRow label="Destination chain" value={destination} />
        <DetailRow label="Amount" value={`${amount} ${symbol}`} />
        {tokenAmount && (
          <DetailRow
            label="Token amount"
            value={`${tokenAmount} ${tokenSymbol}`}
          />
        )}
        <DetailRow
          label="Sender address"
          value={<CopyableAddress address={sender} />}
        />
        <DetailRow
          label="Receiver address"
          value={<CopyableAddress address={receiver} />}
        />
        <DetailRow label="Date created" value={started.toLocaleString()} />
        <DetailRow label="Date finished" value={finished.toLocaleString()} />
        <DetailRow
          label="Status"
          value={
            failed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.62_0.22_25_/_0.15)] px-2 py-0.5 text-[oklch(0.85_0.19_25)]">
                <XIcon className="h-3 w-3" strokeWidth={3} /> {statusLabel}
              </span>
            ) : isRefund ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.78_0.14_85_/_0.15)] px-2 py-0.5 text-[oklch(0.88_0.12_85)]">
                <Undo2 className="h-3 w-3" strokeWidth={3} /> {statusLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.7_0.18_165_/_0.15)] px-2 py-0.5 text-[oklch(0.85_0.15_165)]">
                <Check className="h-3 w-3" strokeWidth={3} /> {statusLabel}
              </span>
            )
          }
        />
      </div>

      <DetailReturnLink className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[oklch(0.62_0.22_25_/_0.5)] bg-[oklch(0.62_0.22_25_/_0.08)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[oklch(0.78_0.19_25)] transition-colors hover:bg-[oklch(0.62_0.22_25_/_0.15)]">
        Close
      </DetailReturnLink>
    </div>
  );
}

function DetailReturnLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const dest = parseReturnTo(Route.useSearch({ select: (s) => s.returnTo }));
  if (dest.to === "/transactions") {
    return (
      <Link to="/transactions" search={dest.search ?? {}} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/bridge-app" className={className}>
      {children}
    </Link>
  );
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  if (!address) {
    return <span className="font-mono">—</span>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="font-mono">{shortAddr(address)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[oklch(0.85_0.15_235)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="max-w-[42%] shrink-0 text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function shortAddr(a: string) {
  if (!a) return "—";
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}
