import { createFileRoute, Link } from "@tanstack/react-router";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, TrendingUp } from "lucide-react";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkToggle } from "@/components/NetworkToggle";
import { useBridgeStats } from "@/hooks/use-bridge-stats";
import { useBridgeHistory } from "@/hooks/use-bridge-history";
import {
  useLockedBreakdown,
  WORLD_KEYS,
  type ChainAddressRows,
  type ChainRows,
  type TokenRow,
  type WorldBreakdown,
  type WorldKey,
} from "@/hooks/use-locked-breakdown";
import {
  priceByTokenName,
  tokenPricesQueryOptions,
} from "@/lib/api/tokenPrice";
import { useTokenColor } from "@/hooks/use-token-infos";
import { useChainColor } from "@/hooks/use-chain-infos";
import { formatUsdFull } from "@/lib/usd";
import { CHAIN_META } from "@/lib/chains";
import { explorerAddressUrl } from "@/lib/explorers";
import logoAsset from "@/assets/skyline-logo-transparent.png";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Skyline Bridge — Proof of Reserves & Audit" },
      {
        name: "description",
        content:
          "A live, public ledger of everything locked in and moved across the Skyline network — verifiable on-chain and updated continuously.",
      },
      {
        property: "og:title",
        content: "Skyline Bridge — Proof of Reserves & Audit",
      },
      {
        property: "og:description",
        content:
          "Every asset, fully accounted for. Live TVL, TVB and per-chain breakdown across the Skyline network.",
      },
    ],
  }),
  component: AuditPage,
});

// ── Token prices (USD) ────────────────────────────────────────────────
/**
 * Token name -> USD. Comes from `GET /tokenPrice`, which already prices every
 * wrapped representation under its own name, so `cAP3X` and `xADA` resolve
 * without any pegging table here. 0 for an asset the price cron does not track
 * (and for every asset until the first response lands).
 */
type PriceOf = (coin: string) => number;
/** null until the first `GET /tokenPrice` response lands. */
const PriceContext = createContext<PriceOf | null>(null);
const UNPRICED: PriceOf = () => 0;
const usePriceOf = (): PriceOf => useContext(PriceContext) ?? UNPRICED;

// ── Worlds ────────────────────────────────────────────────────────────
/** Tab labels. The keys are the chain categories from CHAIN_META. */
const WORLD_LABELS: Record<WorldKey, string> = {
  utxo: "UTxO World",
  evm: "EVM World",
  svm: "SOL World",
};

function usdOfRows(rows: TokenRow[], priceOf: PriceOf) {
  return rows.reduce((s, r) => s + r.amount * priceOf(r.name), 0);
}

/** `Cardano · Prime · Vector` — the chains this world actually holds. */
const chainTag = (world: WorldBreakdown) =>
  [...new Set([...world.locked, ...world.bridged].map((c) => c.label))].join(
    " · ",
  );

/** Biggest holdings first, so dust rows sink to the bottom of a card. */
const byUsdDesc =
  (priceOf: PriceOf) =>
  (a: TokenRow, b: TokenRow): number =>
    b.amount * priceOf(b.name) - a.amount * priceOf(a.name) ||
    b.amount - a.amount;

const sortWorld = (world: WorldBreakdown, priceOf: PriceOf): WorldBreakdown => {
  const sortChains = (chains: ChainRows[]) =>
    chains.map((chain) => ({
      ...chain,
      rows: [...chain.rows].sort(byUsdDesc(priceOf)),
    }));
  /** Fullest address first, so the chain's main custody account leads the list. */
  const sortHolders = (chains: ChainAddressRows[]) =>
    chains.map((chain) => ({
      ...chain,
      addresses: chain.addresses
        .map((holder) => ({
          ...holder,
          rows: [...holder.rows].sort(byUsdDesc(priceOf)),
        }))
        .sort(
          (a, b) => usdOfRows(b.rows, priceOf) - usdOfRows(a.rows, priceOf),
        ),
    }));
  return {
    ...world,
    locked: sortChains(world.locked),
    bridged: sortChains(world.bridged),
    summaryLocked: [...world.summaryLocked].sort(byUsdDesc(priceOf)),
    summaryBridged: [...world.summaryBridged].sort(byUsdDesc(priceOf)),
    holders: sortHolders(world.holders),
  };
};

type Mode = "overview" | "full";

// ── Formatting ────────────────────────────────────────────────────────
const fmtUsdCompact = (n: number) =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(1)}K`
        : `$${n.toFixed(2)}`;
const fmtTok = (n: number) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
/** `12 Jul` — snapshots are UTC midnight, so read them back in UTC. */
const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// Ease-out cubic count-up, mirrors the reference html (1600ms)
function useCountUp(target: number, duration = 1600) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);
  return val;
}

// ── Charts ────────────────────────────────────────────────────────────
/** Null for a series too short to be a line. */
function sparkPath(points: number[], w = 120, h = 34): string | null {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  return points
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Percentage change across the window. Undefined when it cannot be stated: too
 * few points, or a zero baseline, where any rise is an infinite percentage.
 */
function pctChange(series: number[]): number | undefined {
  if (series.length < 2) return undefined;

  const first = series[0];
  const last = series[series.length - 1];
  if (first === 0) return undefined;

  return ((last - first) / first) * 100;
}

/** Window the metric cards trend over, independent of the chart's range. */
const METRIC_TREND_DAYS = 7;

const CHART_W = 900;
const CHART_H = 220;
const RANGE_DAYS = { "7D": 7, "30D": 30, "90D": 90 } as const;
type Range = keyof typeof RANGE_DAYS;

function areaAndLine(series: number[], yMin: number, yMax: number) {
  const stepX = CHART_W / (series.length - 1);
  const scaleY = (v: number) =>
    CHART_H - ((v - yMin) / (yMax - yMin)) * (CHART_H - 20) - 10;
  const line = series
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${scaleY(v).toFixed(1)}`,
    )
    .join(" ");
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
  const last = {
    x: (series.length - 1) * stepX,
    y: scaleY(series[series.length - 1]),
  };
  return { line, area, last };
}

/** One donut arc - a chain's share of the world's locked USD, ready for SVG. */
type DonutSegment = {
  label: string;
  color: string;
  usd: number;
  /** 0..1 share of the world's locked USD. */
  pct: number;
  dash: string;
  offset: number;
};

/** One bar - a chain's share of the world's bridged USD. */
type DistributionBar = {
  label: string;
  color: string;
  usd: number;
  /** CSS width, as a percentage of the world's bridged total. */
  width: string;
};

/** Feeds the page the live USD prices every card reads off the context. */
function AuditPage() {
  const { data: prices } = useQuery(tokenPricesQueryOptions);
  const priceOf = useMemo<PriceOf | null>(() => {
    if (!prices) return null;
    const byName = priceByTokenName(prices);
    return (coin) => byName.get(coin.toUpperCase()) ?? 0;
  }, [prices]);

  return (
    <PriceContext.Provider value={priceOf}>
      <AuditContent />
    </PriceContext.Provider>
  );
}

function AuditContent() {
  const [mode, setMode] = useState<Mode>("overview");
  const [world, setWorld] = useState<WorldKey>("utxo");
  const [range, setRange] = useState<Range>("30D");

  const prices = useContext(PriceContext);
  const priceOf = prices ?? UNPRICED;
  const chainColorOf = useChainColor();

  // Per-chain and per-token amounts, straight from GET /lockedTokens.
  const { worlds, isLoading: breakdownLoading } = useLockedBreakdown();
  const data = useMemo(
    () => sortWorld(worlds[world], priceOf),
    [worlds, world, priceOf],
  );
  const chainCount = new Set(
    [...data.locked, ...data.bridged].map((c) => c.chain),
  ).size;
  // A single-chain world would draw a 100% donut, so it shows summaries alone.
  const showComposition = data.locked.length > 1;
  const isEmpty = chainCount === 0;
  /** What the world tabs say about the figures below them. */
  const worldNote = isEmpty
    ? "Nothing locked or bridged on these chains yet"
    : mode === "overview"
      ? `${chainTag(data)} · snapshot, updated continuously`
      : "Every value, straight from chain state";

  // Both headline figures come from chain state - locked balances and the
  // cumulative transferred totals - priced by the same /tokenPrice endpoint.
  const { tvlUsd, tvbUsd } = useBridgeStats();

  // The cards trend over a fixed week, whatever range the chart below is on.
  const { points: week } = useBridgeHistory(METRIC_TREND_DAYS);
  const trend = useMemo(() => {
    const tvl = week.map((point) => point.tvlUsd);
    const tvb = week.map((point) => point.tvbUsd);
    return {
      tvl,
      tvb,
      tvlPct: pctChange(tvl),
      tvbPct: pctChange(tvb),
    };
  }, [week]);

  // Locked vs. bridged over time, from the daily snapshots the web-api keeps.
  const { points, isLoading: historyLoading } = useBridgeHistory(
    RANGE_DAYS[range],
  );
  const chart = useMemo(() => {
    // A single point cannot be drawn as a line, so it counts as no chart.
    if (points.length < 2) return null;
    const tvl = points.map((p) => p.tvlUsd);
    const tvb = points.map((p) => p.tvbUsd);
    // A flat all-zero history would divide by zero, so keep a floor on the axis
    const yMax = Math.max(...tvl, ...tvb, 1) * 1.1;
    return {
      tvl: areaAndLine(tvl, 0, yMax),
      tvb: areaAndLine(tvb, 0, yMax),
      from: points[0].at,
      mid: points[Math.floor((points.length - 1) / 2)].at,
      to: points[points.length - 1].at,
    };
  }, [points]);

  // Donut: locked composition by chain (USD)
  const donut = useMemo(() => {
    const perChain = data.locked.map((ch) => ({
      label: ch.label,
      color: chainColorOf(ch.chain),
      usd: usdOfRows(ch.rows, priceOf),
    }));
    const total = perChain.reduce((s, x) => s + x.usd, 0) || 1;
    let offset = 0;
    const C = 2 * Math.PI * 52;
    return perChain.map((row) => {
      const pct = row.usd / total;
      const dash = `${(pct * C).toFixed(2)} ${C.toFixed(2)}`;
      const seg = { ...row, pct, dash, offset };
      offset -= pct * C;
      return seg;
    });
  }, [data, priceOf, chainColorOf]);

  // Bars: bridged distribution by chain (USD)
  const bars = useMemo(() => {
    const perChain = data.bridged.map((ch) => ({
      label: ch.label,
      color: chainColorOf(ch.chain),
      usd: usdOfRows(ch.rows, priceOf),
    }));
    const total = perChain.reduce((s, x) => s + x.usd, 0) || 1;
    return perChain.map((b) => ({
      ...b,
      width: `${((b.usd / total) * 100).toFixed(1)}%`,
    }));
  }, [data, priceOf, chainColorOf]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="@container relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Skyline home"
          >
            <img
              src={logoAsset}
              alt="Skyline"
              className="h-8 w-auto max-w-none shrink-0 md:h-9"
            />
          </Link>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 lg:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.72_0.19_245)]">
              Skyline Bridge · Proof of Reserves
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/bridge-app"
              aria-label="Back to Bridge"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden @[24rem]:inline">Back to Bridge</span>
            </Link>
            <span className="hidden md:inline-flex">
              <NetworkToggle />
            </span>
          </div>
        </div>
      </header>

      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="container-page relative py-10 md:py-14">
          <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
            {/* Same treatment as the header bar, so the toggle reads as part of it. */}
            <span className="rounded-full bg-background/70 backdrop-blur-xl">
              <NetworkToggle />
            </span>
          </div>

          {/* Hero */}
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.85_0.15_235)] lg:hidden">
              Skyline Bridge · Proof of Reserves
            </div>
            <h1 className="text-gradient-sky mt-4 text-balance font-display text-4xl font-semibold leading-[1.02] md:text-5xl">
              Every asset, fully accounted for.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              A live, public ledger of everything locked in and moved across the
              Skyline network — spanning Cardano, Apex Fusion, EVM chains and
              Solana, verifiable on-chain and updated continuously.
            </p>
          </div>

          {/* TVL / TVB cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <MetricCard
              label={["Total Value", "Locked · TVL"]}
              usd={tvlUsd}
              deltaPct={trend.tvlPct}
              deltaLabel="7d"
              accent="#3B92FF"
              spark={trend.tvl}
              note="Assets held in Skyline's audited lock contracts, fully redeemable 1:1."
            />
            <MetricCard
              label={["Total Value", "Bridged · TVB"]}
              usd={tvbUsd}
              deltaPct={trend.tvbPct}
              deltaLabel="7d"
              accent="#22C1E4"
              spark={trend.tvb}
              note="Cumulative value transferred across every supported chain since launch."
            />
          </div>

          {/* Chart */}
          <div className="card-glow mt-6 rounded-2xl p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-base font-semibold">
                  Locked vs. Bridged
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Rolling {range} view · daily snapshots, valued at today's
                  prices
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Legend color="#3B92FF" label="TVL" />
                <Legend color="#22C1E4" label="TVB" />
                <div className="inline-flex gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                  {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        range === r
                          ? "bg-[oklch(0.72_0.19_245)] text-[oklch(0.14_0.03_260)]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {chart ? (
              <>
                <svg
                  viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  preserveAspectRatio="none"
                  className="mt-4 block h-[220px] w-full"
                >
                  <defs>
                    <linearGradient id="a-tvb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#22C1E4" stopOpacity="0.34" />
                      <stop offset="1" stopColor="#22C1E4" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="a-tvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#3B92FF" stopOpacity="0.32" />
                      <stop offset="1" stopColor="#3B92FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line
                      key={f}
                      x1="0"
                      y1={CHART_H * f}
                      x2={CHART_W}
                      y2={CHART_H * f}
                      stroke="rgba(255,255,255,0.05)"
                    />
                  ))}
                  <path d={chart.tvb.area} fill="url(#a-tvb)" />
                  <path
                    d={chart.tvb.line}
                    fill="none"
                    stroke="#22C1E4"
                    strokeWidth="2.4"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path d={chart.tvl.area} fill="url(#a-tvl)" />
                  <path
                    d={chart.tvl.line}
                    fill="none"
                    stroke="#3B92FF"
                    strokeWidth="2.4"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={chart.tvb.last.x}
                    cy={chart.tvb.last.y}
                    r="9"
                    fill="#22C1E4"
                    opacity="0.22"
                  />
                  <circle
                    cx={chart.tvb.last.x}
                    cy={chart.tvb.last.y}
                    r="4"
                    fill="#22C1E4"
                  />
                  <circle
                    cx={chart.tvl.last.x}
                    cy={chart.tvl.last.y}
                    r="9"
                    fill="#3B92FF"
                    opacity="0.22"
                  />
                  <circle
                    cx={chart.tvl.last.x}
                    cy={chart.tvl.last.y}
                    r="4"
                    fill="#3B92FF"
                  />
                </svg>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>{fmtDay(chart.from)}</span>
                  <span>{fmtDay(chart.mid)}</span>
                  <span>{fmtDay(chart.to)}</span>
                </div>
              </>
            ) : (
              <div className="mt-4 flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center text-xs text-muted-foreground">
                {historyLoading
                  ? "Loading history…"
                  : points.length === 1
                    ? "Only one snapshot so far — the chart needs at least two days of history."
                    : "No history yet — snapshots are taken daily at 00:00 UTC."}
              </div>
            )}
          </div>

          {/* Overview / Full Audit selector */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {(["overview", "full"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    mode === m
                      ? "bg-[oklch(0.72_0.19_245)] text-[oklch(0.14_0.03_260)] shadow-[0_6px_20px_-8px_oklch(0.72_0.19_245_/_0.9)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "overview" ? "Overview" : "Full Audit"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Simple summary, or every last number.
            </span>
          </div>

          {/* World tabs — the note sits below them on a phone, where sharing the
              row would squeeze the tab labels onto two lines each. */}
          <div className="mt-8">
            <div className="flex items-end gap-5 border-b border-white/10 md:gap-6">
              {WORLD_KEYS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWorld(w)}
                  className={`relative flex-none whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${
                    world === w
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {WORLD_LABELS[w]}
                  {world === w && (
                    <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[oklch(0.72_0.19_245)]" />
                  )}
                </button>
              ))}
              <span className="ml-auto hidden pb-3 text-xs text-muted-foreground md:block">
                {worldNote}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground md:hidden">
              {worldNote}
            </div>
          </div>

          {isEmpty ? (
            <div className="mt-6 flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center text-xs text-muted-foreground">
              {breakdownLoading
                ? "Loading balances…"
                : `No locked or bridged balances reported for ${WORLD_LABELS[world]}.`}
            </div>
          ) : mode === "overview" ? (
            /* Composition pair on top, the token lists they break down below -
               so a world with many tokens grows downward instead of leaving the
               charts stranded beside one long column.
               grid-cols-1 rather than an implicit track: an auto track takes the
               widest card's min-content, which on a phone pushes every card in
               the column past the screen edge. */
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              {showComposition && (
                <>
                  <LockedCompositionCard segments={donut} />
                  <BridgedDistributionCard bars={bars} />
                </>
              )}
              <SummaryCard title="Total Locked" rows={data.summaryLocked} />
              <SummaryCard title="Total Bridged" rows={data.summaryBridged} />
            </div>
          ) : (
            (() => {
              // Union of the world's chains, locked order first
              const lockedByChain = new Map(
                data.locked.map((c) => [c.chain, c]),
              );
              const bridgedByChain = new Map(
                data.bridged.map((c) => [c.chain, c]),
              );
              const chainOrder = [
                ...new Set([...lockedByChain.keys(), ...bridgedByChain.keys()]),
              ];
              return (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                    {/* Row 1 — summary cards */}
                    <SummaryOnly
                      title="Total Locked"
                      rows={data.summaryLocked}
                    />
                    <SummaryOnly
                      title="Total Bridged"
                      rows={data.summaryBridged}
                    />

                    {/* Row 2 — per-chain headers */}
                    <SectionLabel>Total Locked Per Chain</SectionLabel>
                    <SectionLabel>Total Bridged Per Chain</SectionLabel>

                    {/* Rows 3..N — chain pairs, one grid row per chain */}
                    {chainOrder.map((chain) => (
                      <div key={chain} className="contents">
                        <ChainCard entry={lockedByChain.get(chain)} />
                        <ChainCard entry={bridgedByChain.get(chain)} />
                      </div>
                    ))}
                  </div>

                  <HoldersSection chains={data.holders} world={world} />
                </>
              );
            })()
          )}

          {/*<div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[oklch(0.85_0.15_235)]" />
              Updated 2m ago · figures verified against on-chain state ·{" "}
              <span className="tabular-nums">
                AP3X ${priceOf("AP3X").toFixed(5)} · ADA ${priceOf("ADA").toFixed(4)}
              </span>
            </div>
            <a href="#" className="inline-flex items-center gap-1.5 text-[oklch(0.85_0.15_235)] hover:underline">
              View on-chain contracts <ExternalLink className="h-3 w-3" />
            </a>
          </div>*/}
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
          <Link
            to="/bridge-app"
            className="order-1 text-[oklch(0.85_0.15_235)] hover:underline md:order-3 md:flex-1 md:text-right"
          >
            Return to Bridge →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  label,
  usd,
  deltaPct,
  deltaLabel,
  accent,
  spark,
  note,
}: {
  /**
   * The card's title in two parts - one line normally, one part per line at
   * 360px and under, where the whole title beside the delta chip is a squeeze.
   */
  label: [string, string];
  /** Undefined until the figure has loaded. */
  usd: number | undefined;
  /** Change over `deltaLabel`, in percent. Undefined when not yet computable. */
  deltaPct: number | undefined;
  deltaLabel: string;
  accent: string;
  /** USD per day, oldest first. Fewer than two points draws nothing. */
  spark: number[];
  note: string;
}) {
  const counted = useCountUp(usd ?? 0);
  const trend = sparkPath(spark);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 p-6"
      style={{
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.02))`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {/* max-[361px] rather than max-[360px]: the variant is an exclusive
              upper bound, and 360 itself has to break. */}
          <span className="max-[382px]:block">{label[0]}</span>{" "}
          <span>{label[1]}</span>
        </span>
        <DeltaChip pct={deltaPct} label={deltaLabel} />
      </div>
      <div className="mt-4 font-display text-4xl font-bold tabular-nums leading-none">
        {usd === undefined ? "—" : formatUsdFull(counted)}
      </div>

      {/* The sparkline is pinned to the card's bottom-right corner, so the note
          has to stop short of it: it gives up the graph's width plus its inset,
          and wraps into three shorter lines alongside instead. Two thresholds
          because the graph is smaller under 500px — see its classes below. */}
      <div className="mt-4 max-w-[min(12.5rem,calc(100%-7.75rem))] text-xs leading-relaxed text-muted-foreground min-[500px]:max-w-[min(20rem,calc(100%-8.75rem))]">
        {note}
      </div>
      {trend && (
        <svg
          viewBox="0 0 120 34"
          className="absolute bottom-5 right-5 h-[26px] w-[92px] opacity-90 min-[500px]:h-[34px] min-[500px]:w-[120px]"
        >
          <path
            d={trend}
            fill="none"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * Change over the trend window. A fall has to read as a fall, and an
 * uncomputable change as unknown - not as a green rise.
 */
function DeltaChip({ pct, label }: { pct: number | undefined; label: string }) {
  if (pct === undefined || !Number.isFinite(pct)) {
    return (
      <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-muted-foreground">
        — · {label}
      </span>
    );
  }

  const rising = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  const tone = flat
    ? "bg-white/[0.06] text-muted-foreground"
    : rising
      ? "bg-[oklch(0.75_0.18_155_/_0.15)] text-[oklch(0.85_0.18_155)]"
      : "bg-[oklch(0.65_0.2_25_/_0.15)] text-[oklch(0.78_0.19_25)]";

  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-semibold tabular-nums ${tone}`}
    >
      {flat ? "" : rising ? "▲ " : "▼ "}
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}% · {label}
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/**
 * Locked USD split across the world's chains. `self-stretch` keeps it level with
 * the distribution card beside it, and the centred body means the taller of the
 * two never leaves the other with a blank foot.
 */
function LockedCompositionCard({ segments }: { segments: DonutSegment[] }) {
  return (
    <div className="card-glow flex flex-col rounded-2xl p-5 md:p-6 lg:self-stretch">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Locked composition · by chain
      </div>
      {/* Stacked until the row has space for the legend's three columns - on a
          phone the donut beside them squeezes the percentages off the card. */}
      <div className="mt-4 flex flex-1 flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <svg
          viewBox="0 0 120 120"
          className="h-28 w-28 flex-none sm:h-[132px] sm:w-[132px]"
        >
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="15"
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={seg.color}
              strokeWidth="15"
              strokeDasharray={seg.dash}
              strokeDashoffset={seg.offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center gap-2 text-[13px] font-medium"
            >
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: seg.color }}
              />
              <span className="min-w-0 flex-1 truncate">{seg.label}</span>
              <span className="flex-none tabular-nums text-muted-foreground">
                {fmtUsdCompact(seg.usd)}
              </span>
              <span className="w-12 flex-none text-right font-semibold tabular-nums sm:w-14">
                {(seg.pct * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Bridged USD split across the world's chains, as proportional bars. */
function BridgedDistributionCard({ bars }: { bars: DistributionBar[] }) {
  return (
    <div className="card-glow flex flex-col rounded-2xl p-5 md:p-6 lg:self-stretch">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Bridged distribution · by chain
      </div>
      {bars.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center text-[11px] text-muted-foreground">
          Nothing bridged out of these chains yet.
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-center gap-3.5">
          {bars.map((b, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2 text-xs font-medium">
                <span className="min-w-0 truncate">{b.label}</span>
                <span className="flex-none tabular-nums text-muted-foreground">
                  {fmtUsdCompact(b.usd)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{ width: b.width, background: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: TokenRow[] }) {
  const priceOf = usePriceOf();
  const colorOf = useTokenColor();
  const totalUsd = usdOfRows(rows, priceOf);
  return (
    <div className="card-glow rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
        <div className="text-[11px] font-semibold tabular-nums text-[oklch(0.85_0.15_235)]">
          {fmtUsdCompact(totalUsd)}
        </div>
      </div>
      <div className="mt-3 divide-y divide-white/5">
        {rows.length === 0 && <EmptyRows />}
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <span className="inline-flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: colorOf(row.tokenID) }}
              />
              <span className="text-sm font-semibold">{row.name}</span>
            </span>
            <span className="text-right">
              <span className="font-display text-base font-semibold tabular-nums">
                {fmtTok(row.amount)}
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {fmtUsdCompact(row.amount * priceOf(row.name))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryOnly({ title, rows }: { title: string; rows: TokenRow[] }) {
  const priceOf = usePriceOf();
  const colorOf = useTokenColor();
  const totalUsd = usdOfRows(rows, priceOf);
  return (
    <div className="card-glow rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
        <div className="text-[11px] font-semibold tabular-nums text-[oklch(0.85_0.15_235)]">
          {fmtUsdCompact(totalUsd)}
        </div>
      </div>
      <div className="mt-3 divide-y divide-white/5">
        {rows.length === 0 && <EmptyRows />}
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: colorOf(row.tokenID) }}
              />
              {row.name}
            </span>
            <span className="text-right tabular-nums">
              <span className="font-semibold">{fmtTok(row.amount)}</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {fmtUsdCompact(row.amount * priceOf(row.name))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A card whose token list came back empty - nothing held, not an error. */
function EmptyRows() {
  return (
    <div className="py-3 text-[11px] text-muted-foreground">
      No balances reported.
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

/** A chain's icon and name, in its own accent - the head of every chain card. */
function ChainHeading({
  chain,
  label,
  children,
}: {
  chain: string;
  label: string;
  /** Right-hand side of the row, typically the chain's headline figure. */
  children?: React.ReactNode;
}) {
  const chainColorOf = useChainColor();
  const icon = CHAIN_META[chain]?.icon;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex min-w-0 items-center gap-2.5">
        {icon ? (
          <img
            src={icon}
            alt={label}
            className="h-6 w-6 flex-none rounded-full"
          />
        ) : (
          <span
            className="h-2.5 w-2.5 flex-none rounded-sm"
            style={{ background: chainColorOf(chain) }}
          />
        )}
        <span
          className="truncate text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: chainColorOf(chain) }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function ChainCard({ entry }: { entry?: ChainRows }) {
  const priceOf = usePriceOf();
  if (!entry) {
    // Empty slot: keeps the grid row height honest so the paired card aligns.
    return <div aria-hidden className="hidden lg:block" />;
  }
  const { chain, label, rows } = entry;
  const chainUsd = usdOfRows(rows, priceOf);
  return (
    <div className="card-glow rounded-2xl p-4 md:p-5">
      <ChainHeading chain={chain} label={label}>
        <span className="flex-none text-[11px] tabular-nums text-muted-foreground">
          {fmtUsdCompact(chainUsd)}
        </span>
      </ChainHeading>
      <div className="mt-2 divide-y divide-white/5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 text-[13px]"
          >
            <span className="text-muted-foreground">{row.name}</span>
            <span className="text-right tabular-nums">
              <span>{fmtTok(row.amount)}</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {fmtUsdCompact(row.amount * priceOf(row.name))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Where the locked funds actually sit: every holding address of every chain in
 * the world, with what it holds and a link to check it on chain.
 *
 * Locked only - a bridged total is the sum of past transfers out of a chain, not
 * a balance, so no address holds it.
 */
function HoldersSection({
  chains,
  world,
}: {
  chains: ChainAddressRows[];
  world: WorldKey;
}) {
  const addressCount = chains.reduce((n, c) => n + c.addresses.length, 0);
  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-display text-base font-semibold">
            Per-address breakdown · by chain
          </div>
          <div className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Every address holding locked funds on the chains above, and what
            each one holds. Open any of them in its explorer to verify the
            balance against chain state.
          </div>
        </div>
        {addressCount > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {addressCount} address{addressCount === 1 ? "" : "es"} ·{" "}
            {chains.length} chain{chains.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {chains.length === 0 ? (
        <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center text-xs text-muted-foreground">
          No holding addresses reported for {WORLD_LABELS[world]}.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {chains.map((entry) => (
            <HolderCard key={entry.chain} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One chain's holding addresses, fullest first. */
function HolderCard({ entry }: { entry: ChainAddressRows }) {
  const priceOf = usePriceOf();
  const { chain, label, addresses } = entry;
  const chainUsd = addresses.reduce(
    (sum, holder) => sum + usdOfRows(holder.rows, priceOf),
    0,
  );
  return (
    <div className="card-glow rounded-2xl p-4 md:p-5">
      <ChainHeading chain={chain} label={label}>
        <span className="flex-none text-[11px] tabular-nums text-muted-foreground">
          {addresses.length} address{addresses.length === 1 ? "" : "es"} ·{" "}
          {fmtUsdCompact(chainUsd)}
        </span>
      </ChainHeading>
      <div className="mt-1 divide-y divide-white/5">
        {addresses.map((holder) => (
          <div
            key={holder.address}
            className="flex flex-col gap-2 py-3 md:flex-row md:items-start md:justify-between md:gap-8"
          >
            <AddressLink chain={chain} address={holder.address} />
            {/* Declared column tracks, not per-row flex: a token name wider than
                its column used to drag that row's figures out of line with the
                rows around it. The name column takes the slack, so amounts and
                USD stay in the same place in every row of every card. */}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7rem,auto)_minmax(4rem,auto)] items-baseline gap-x-3 gap-y-1 text-[13px] md:w-80 md:flex-none md:gap-x-4">
              {holder.rows.map((row) => (
                <Fragment key={row.tokenID}>
                  <span className="min-w-0 break-words text-muted-foreground">
                    {row.name}
                  </span>
                  <span className="text-right tabular-nums">
                    {fmtTok(row.amount)}
                  </span>
                  <span className="text-right text-[11px] tabular-nums text-muted-foreground">
                    {fmtUsdCompact(row.amount * priceOf(row.name))}
                  </span>
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The address in full, linked to its explorer. Shown as plain text for a chain
 * with no explorer listed for this network, rather than linked somewhere the
 * address does not exist.
 */
function AddressLink({ chain, address }: { chain: string; address: string }) {
  const url = explorerAddressUrl(chain, address);
  if (!url) {
    return (
      <span className="min-w-0 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
        {address}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open in explorer"
      className="group inline-flex min-w-0 items-start gap-1.5 text-muted-foreground transition-colors hover:text-[oklch(0.85_0.15_235)]"
    >
      <span className="break-all font-mono text-[11px] leading-relaxed">
        {address}
      </span>
      <ExternalLink className="mt-0.5 h-3 w-3 flex-none opacity-60 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
