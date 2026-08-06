import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  X as XIcon,
  Wallet,
  ExternalLink,
  History,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { z } from "zod";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkBadge } from "@/components/NetworkToggle";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import { useBridgeStats } from "@/hooks/use-bridge-stats";
import { formatUsdCompact, formatUsdFull } from "@/lib/usd";
import ethIcon from "@/assets/chains/ethereum.svg?url";
import solIcon from "@/assets/chains/solana.svg?url";
import adaIcon from "@/assets/chains/cardano.svg?url";
import polyIcon from "@/assets/chains/polygon.svg?url";
import bnbIcon from "@/assets/chains/bnb.svg?url";
import baseIcon from "@/assets/chains/coinbase.svg?url";
import primeIcon from "@/assets/chains/prime.svg?url";
import nexusIcon from "@/assets/chains/nexus.svg?url";
import vectorIcon from "@/assets/chains/vector.svg?url";
import arbIcon from "@/assets/chains/arbi.svg?url";
import katanaIcon from "@/assets/chains/katana.svg?url";
import scrollIcon from "@/assets/chains/scroll.svg?url";
import seiIcon from "@/assets/chains/sei.svg?url";
import uniIcon from "@/assets/chains/unichain.svg?url";

const CHAIN_META: Record<
  string,
  { label: string; icon: string; symbol: string }
> = {
  prime: { label: "Prime", icon: primeIcon, symbol: "AP3X" },
  nexus: { label: "Nexus", icon: nexusIcon, symbol: "AP3X" },
  vector: { label: "Vector", icon: vectorIcon, symbol: "AP3X" },
  eth: { label: "Ethereum", icon: ethIcon, symbol: "ETH" },
  sol: { label: "Solana", icon: solIcon, symbol: "SOL" },
  ada: { label: "Cardano", icon: adaIcon, symbol: "ADA" },
  bnb: { label: "BNB Chain", icon: bnbIcon, symbol: "BNB" },
  sei: { label: "Sei", icon: seiIcon, symbol: "SEI" },
  base: { label: "Base", icon: baseIcon, symbol: "ETH" },
  arb: { label: "Arbitrum", icon: arbIcon, symbol: "ETH" },
  poly: { label: "Polygon", icon: polyIcon, symbol: "POL" },
  uni: { label: "Unichain", icon: uniIcon, symbol: "ETH" },
  scroll: { label: "Scroll", icon: scrollIcon, symbol: "ETH" },
  katana: { label: "Katana", icon: katanaIcon, symbol: "ETH" },
};

const searchSchema = z.object({
  src: z.string().default("nexus"),
  dst: z.string().default("prime"),
  amount: z.string().default("0"),
  addr: z.string().default(""),
  sender: z.string().default(""),
  // Optional forced-fail index for demo/testing: ?fail=0|1|2
  fail: z.coerce.number().int().min(0).max(2).optional(),
});

export const Route = createFileRoute("/transaction/$id")({
  validateSearch: (s) => searchSchema.parse(s),
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

type StageStatus = "pending" | "active" | "success" | "failed";

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

type DetailState = "done" | "active" | "pending" | "failed";

type DetailStep = {
  key: string;
  title: string;
  description: string;
  state: DetailState;
};

// Plain-language copy for each raw bridging status, written for non-technical users.
const STATUS_COPY: Record<
  string,
  {
    title: (s: string, d: string) => string;
    desc: (s: string, d: string) => string;
  }
> = {
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
      `Your assets have landed on the ${d} chain — the transfer is complete.`,
  },
  InvalidRequest: {
    title: () => "Request couldn't be validated",
    desc: () =>
      "Some details of the transfer didn't check out, so it was stopped safely before any funds were moved.",
  },
  FailedToExecuteOnDestination: {
    title: (_s, d) => `Couldn't complete on ${d}`,
    desc: (_s, d) =>
      `The assets couldn't be released on the ${d} chain. Your funds are safe — please reach out to support to resolve it.`,
  },
};

// The happy-path order of statuses a transfer moves through.
const HAPPY_PATH = [
  "DiscoveredOnSource",
  "SubmittedToBridge",
  "IncludedInBatch",
  "SubmittedToDestination",
  "ExecutedOnDestination",
] as const;

// Derive the fine-grained, ordered status list from the 3 coarse loader stages.
function buildBridgingSteps(
  stages: StageStatus[],
  sourceLabel: string,
  destLabel: string,
): DetailStep[] {
  const mk = (key: string, state: DetailState): DetailStep => ({
    key,
    state,
    title: STATUS_COPY[key].title(sourceLabel, destLabel),
    description: STATUS_COPY[key].desc(sourceLabel, destLabel),
  });

  const failedStage = stages.findIndex((s) => s === "failed");
  const successes = stages.filter((s) => s === "success").length;
  // How many happy-path steps are fully complete for a given number of finished stages.
  const doneCount = [0, 1, 3, 5][successes];

  if (failedStage === -1) {
    return HAPPY_PATH.map((key, i) =>
      mk(key, i < doneCount ? "done" : i === doneCount ? "active" : "pending"),
    );
  }

  // Destination failure: everything up to the release step happened, then it failed there.
  if (failedStage === 2) {
    return [
      mk("DiscoveredOnSource", "done"),
      mk("SubmittedToBridge", "done"),
      mk("IncludedInBatch", "done"),
      mk("SubmittedToDestination", "done"),
      mk("FailedToExecuteOnDestination", "failed"),
    ];
  }

  // Earlier failure: the request was rejected as invalid before it could be relayed.
  const reached = failedStage === 0 ? 1 : 2;
  return [
    ...HAPPY_PATH.slice(0, reached).map((key) => mk(key, "done")),
    mk("InvalidRequest", "failed"),
    ...HAPPY_PATH.slice(reached).map((key) => mk(key, "pending")),
  ];
}

function StepIcon({ state }: { state: DetailState }) {
  if (state === "done") {
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

function BridgingDetail({ steps }: { steps: DetailStep[] }) {
  return (
    <ol className="mt-4 grid gap-3 border-t border-white/5 pt-4">
      {steps.map((s) => (
        <li key={s.key} className="flex items-start gap-3">
          <StepIcon state={s.state} />
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

function TransactionPage() {
  const { id } = Route.useParams();
  const { src, dst, amount, addr, sender, fail } = Route.useSearch();
  const isCompact = useMediaQuery("(max-width: 1000px)");
  const { tvlUsd, tvbUsd } = useBridgeStats();

  const source = CHAIN_META[src] ?? CHAIN_META.nexus;
  const destination = CHAIN_META[dst] ?? CHAIN_META.prime;

  // Mock wallet balances of the transferred token on each chain (placeholder data).
  const sourceBalance = "5.999990";
  const destBalance = "12.480000";

  // If fail is not explicitly set via search, randomly fail ~15% and pick a stage.
  const forcedFail = useMemo(() => {
    if (typeof fail === "number") return fail;
    if (Math.random() < 0.15) return Math.floor(Math.random() * 3);
    return -1;
  }, [fail]);

  const [stages, setStages] = useState<StageStatus[]>([
    "active",
    "pending",
    "pending",
  ]);
  const [startedAt] = useState<Date>(new Date());
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const detailSteps = buildBridgingSteps(
    stages,
    source.label,
    destination.label,
  );

  const overallDone = stages.every((s) => s === "success");
  const overallFailed = stages.some((s) => s === "failed");

  useEffect(() => {
    let cancelled = false;
    const durations = [2500, 3200, 2400];

    const runStage = (i: number) => {
      if (cancelled || i >= 3) return;
      setStages((prev) => prev.map((s, idx) => (idx === i ? "active" : s)));
      const t = setTimeout(() => {
        if (cancelled) return;
        if (i === forcedFail) {
          setStages((prev) => prev.map((s, idx) => (idx === i ? "failed" : s)));
          setFinishedAt(new Date());
          return;
        }
        setStages((prev) => prev.map((s, idx) => (idx === i ? "success" : s)));
        if (i === 2) {
          setFinishedAt(new Date());
        } else {
          runStage(i + 1);
        }
      }, durations[i]);
      return () => clearTimeout(t);
    };

    const cleanup = runStage(0);
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [forcedFail]);

  const statusLabel = overallFailed
    ? "Transfer failed"
    : overallDone
      ? "Transfer complete"
      : "Transfer in progress";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Skyline home"
          >
            <img
              src={logoAsset}
              alt="Skyline"
              className="h-8 w-auto md:h-9"
              data-skyline-logo-target
            />
          </Link>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 min-[875px]:flex">
            <Link
              to="/audit"
              title="Open the full proof-of-reserves audit"
              aria-label="Open the full proof-of-reserves audit"
              className="pointer-events-auto group"
            >
              <StatChip
                label="TVL"
                value={
                  isCompact ? formatUsdCompact(tvlUsd) : formatUsdFull(tvlUsd)
                }
                interactive
              />
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <Link
              to="/audit"
              title="Open the full proof-of-reserves audit"
              aria-label="Open the full proof-of-reserves audit"
              className="pointer-events-auto group"
            >
              <StatChip
                label="TVB"
                value={
                  isCompact ? formatUsdCompact(tvbUsd) : formatUsdFull(tvbUsd)
                }
                interactive
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {sender && (
              <div className="btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold">
                <Wallet className="h-4 w-4" />
                {shortAddr(sender)}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[875px]:hidden">
          <Link
            to="/audit"
            title="Open the full proof-of-reserves audit"
            aria-label="Open audit"
            className="group"
          >
            <StatChip
              label="TVL"
              value={formatUsdCompact(tvlUsd)}
              compact
              interactive
            />
          </Link>
          <Link
            to="/audit"
            title="Open the full proof-of-reserves audit"
            aria-label="Open audit"
            className="group"
          >
            <StatChip
              label="TVB"
              value={formatUsdCompact(tvbUsd)}
              compact
              interactive
            />
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="container-page relative py-6 md:py-8">
          <div className="mx-auto max-w-5xl">
            <Link
              to="/bridge-app"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to bridge
            </Link>

            <div className="card-glow relative mt-4 animate-bridge-step-in rounded-3xl p-5 md:p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              <div className="grid gap-8 md:grid-cols-2">
                {/* Left: summary / details */}
                <div className="relative grid content-start gap-4">
                  <div
                    key={finishedAt ? "details" : "summary"}
                    className="animate-panel-swap grid content-start gap-4"
                  >
                    {finishedAt ? (
                      <TransactionDetails
                        source={source.label}
                        destination={destination.label}
                        amount={amount}
                        symbol={source.symbol}
                        sender={sender}
                        receiver={addr}
                        started={startedAt}
                        finished={finishedAt}
                        failed={overallFailed}
                      />
                    ) : (
                      <>
                        <ChainSummary label="Source" chain={source} />
                        <ChainSummary label="Destination" chain={destination} />
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Amount
                          </div>
                          <div className="mt-1 font-display text-2xl font-semibold text-foreground">
                            {amount || "0"}{" "}
                            <span className="text-sm font-medium text-muted-foreground">
                              {source.symbol}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Balance on {source.label}
                              </div>
                              <div className="mt-1 font-display text-base font-semibold text-foreground">
                                {sourceBalance}{" "}
                                <span className="text-xs font-medium text-muted-foreground">
                                  {source.symbol}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Balance on {destination.label}
                              </div>
                              <div className="mt-1 font-display text-base font-semibold text-foreground">
                                {destBalance}{" "}
                                <span className="text-xs font-medium text-muted-foreground">
                                  {source.symbol}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: progress */}
                <div className="relative flex flex-col rounded-2xl border border-white/10 bg-[oklch(0.14_0.03_260_/_0.5)] p-5 md:p-6">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
                        overallFailed
                          ? "text-[oklch(0.78_0.19_25)]"
                          : overallDone
                            ? "text-[oklch(0.85_0.15_165)]"
                            : "text-[oklch(0.85_0.15_235)]"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    {!overallDone && !overallFailed && <SmallSpinner />}
                  </div>

                  <div className="mt-6 grid grid-cols-3 items-start gap-2">
                    {stages.map((status, i) => (
                      <StageColumn
                        key={i}
                        index={i}
                        status={status}
                        title={STAGE_LABELS[i].title}
                        chainIcon={
                          i === 0
                            ? source.icon
                            : i === 2
                              ? destination.icon
                              : undefined
                        }
                        chainLabel={
                          i === 0
                            ? source.label
                            : i === 2
                              ? destination.label
                              : "Bridge"
                        }
                        description={STAGE_LABELS[i].describe(
                          source.label,
                          destination.label,
                        )}
                      />
                    ))}
                  </div>

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

                  {showDetails && <BridgingDetail steps={detailSteps} />}

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
                      className="btn-primary-glow inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em]"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /> View
                      explorer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-background">
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:flex-1 md:justify-start">
            <span>
              © {new Date().getFullYear()} Skyline. All rights reserved.
            </span>
            <FooterLegal />
          </div>
          <FooterSocials className="md:flex-1 md:justify-center" />
          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <span className="text-muted-foreground/70">Network:</span>
            {/* Read-only — the transfer is bound to the network it was started on. */}
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

function StageColumn({
  index,
  status,
  title,
  chainIcon,
  chainLabel,
  description,
}: {
  index: number;
  status: StageStatus;
  title: string;
  chainIcon?: string;
  chainLabel: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <StageOrb
        index={index}
        status={status}
        chainIcon={chainIcon}
        chainLabel={chainLabel}
      />
      <StatusBadge status={status} index={index} />
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
}: {
  index: number;
  status: StageStatus;
  chainIcon?: string;
  chainLabel: string;
}) {
  const active = status === "active";
  const failed = status === "failed";
  const done = status === "success";

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {active && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-[oklch(0.72_0.19_245_/_0.35)] blur-xl" />
      )}
      {failed && (
        <div className="absolute inset-0 rounded-full bg-[oklch(0.62_0.22_25_/_0.35)] blur-xl" />
      )}
      {done && (
        <div className="absolute inset-0 rounded-full bg-[oklch(0.7_0.18_165_/_0.28)] blur-xl" />
      )}

      {index === 1 ? (
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border ${
            active
              ? "border-[oklch(0.72_0.19_245_/_0.6)]"
              : failed
                ? "border-[oklch(0.62_0.22_25_/_0.6)]"
                : done
                  ? "border-[oklch(0.7_0.18_165_/_0.55)]"
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
                    ? "bg-[oklch(0.7_0.18_165_/_0.35)]"
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
                  ? "border-[oklch(0.7_0.18_165_/_0.55)]"
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
}: {
  status: StageStatus;
  index: number;
}) {
  if (status === "success") {
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

function StatChip({
  label,
  value,
  compact,
  interactive,
}: {
  label: string;
  value: string;
  compact?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur transition-colors ${
        compact ? "px-3 py-1" : "px-3.5 py-1.5"
      } ${interactive ? "group-hover:border-[oklch(0.72_0.19_245_/_0.55)] group-hover:bg-white/[0.07]" : ""}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.85_0.15_235)]">
        {label}
      </span>
      <span
        className={`font-display font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}

function TransactionDetails({
  source,
  destination,
  amount,
  symbol,
  sender,
  receiver,
  started,
  finished,
  failed,
}: {
  source: string;
  destination: string;
  amount: string;
  symbol: string;
  sender: string;
  receiver: string;
  started: Date;
  finished: Date;
  failed: boolean;
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
        <DetailRow label="Token amount" value={`${amount || "0"} ${symbol}`} />
        <DetailRow
          label="Sender address"
          value={<span className="font-mono">{shortAddr(sender)}</span>}
        />
        <DetailRow
          label="Receiver address"
          value={<span className="font-mono">{shortAddr(receiver)}</span>}
        />
        <DetailRow label="Date created" value={started.toLocaleString()} />
        <DetailRow label="Date finished" value={finished.toLocaleString()} />
        <DetailRow
          label="Status"
          value={
            failed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.62_0.22_25_/_0.15)] px-2 py-0.5 text-[oklch(0.85_0.19_25)]">
                <XIcon className="h-3 w-3" strokeWidth={3} /> Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.7_0.18_165_/_0.15)] px-2 py-0.5 text-[oklch(0.85_0.15_165)]">
                <Check className="h-3 w-3" strokeWidth={3} /> Success
              </span>
            )
          }
        />
      </div>

      <Link
        to="/bridge-app"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[oklch(0.62_0.22_25_/_0.5)] bg-[oklch(0.62_0.22_25_/_0.08)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[oklch(0.78_0.19_25)] transition-colors hover:bg-[oklch(0.62_0.22_25_/_0.15)]"
      >
        Close
      </Link>
    </div>
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
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function shortAddr(a: string) {
  if (!a) return "—";
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}
