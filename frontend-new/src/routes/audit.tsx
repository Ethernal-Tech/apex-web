import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, TrendingUp } from "lucide-react";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkToggle } from "@/components/NetworkToggle";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import primeIcon from "@/assets/chains/prime.svg?url";
import nexusIcon from "@/assets/chains/nexus.svg?url";
import vectorIcon from "@/assets/chains/vector.svg?url";
import adaIcon from "@/assets/chains/cardano.svg?url";

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
const AP3X_USD = 0.01598;
const ADA_USD = 0.1751;
// Wrapped variants are pegged to their underlying
const PRICE: Record<string, number> = {
  AP3X: AP3X_USD,
  cAP3X: AP3X_USD,
  bAP3X: AP3X_USD,
  bnAP3X: AP3X_USD,
  ADA: ADA_USD,
  xADA: ADA_USD,
};
const COIN_COLOR: Record<string, string> = {
  AP3X: "#3B92FF",
  cAP3X: "#8B7CFF",
  bAP3X: "#22C1E4",
  bnAP3X: "#F0B429",
  ADA: "#4F7BFF",
  xADA: "#2FD3A5",
};
const CHAIN_COLOR: Record<string, string> = {
  Cardano: "#22C1E4",
  Prime: "#3B92FF",
  Vector: "#c99bff",
  Nexus: "#7cc4ff",
  Base: "#63b6ff",
  BSC: "#F0B429",
};
const CHAIN_ICON: Record<string, string | undefined> = {
  Cardano: adaIcon,
  Prime: primeIcon,
  Vector: vectorIcon,
  Nexus: nexusIcon,
};

// ── Data (exact amounts from the reference design) ────────────────────
type CoinRow = { c: string; v: number };
type ChainRows = { chain: string; rows: CoinRow[] };
type WorldData = {
  key: "utxo" | "evm";
  name: string;
  tag: string;
  summaryLocked: CoinRow[];
  summaryBridged: CoinRow[];
  lockedNote?: string;
  lockedChain: ChainRows[];
  bridgedChain: ChainRows[];
};

const UTXO: WorldData = {
  key: "utxo",
  name: "UTxO World",
  tag: "Cardano · Prime · Vector",
  summaryLocked: [
    { c: "AP3X", v: 19_131_409.32 },
    { c: "ADA", v: 37_995.28 },
  ],
  lockedNote: "+ 2,980,870,611.75 cAP3X collateral held on Cardano",
  summaryBridged: [
    { c: "AP3X", v: 87_477_319.83 },
    { c: "ADA", v: 59_956.31 },
  ],
  lockedChain: [
    {
      chain: "Cardano",
      rows: [
        { c: "cAP3X", v: 2_980_870_611.75 },
        { c: "ADA", v: 37_995.28 },
      ],
    },
    { chain: "Prime", rows: [{ c: "AP3X", v: 19_131_194.24 }] },
    {
      chain: "Vector",
      rows: [
        { c: "xADA", v: 44_999_962_942.53 },
        { c: "AP3X", v: 215.08 },
      ],
    },
  ],
  bridgedChain: [
    {
      chain: "Cardano",
      rows: [
        { c: "cAP3X", v: 34_171_856.23 },
        { c: "ADA", v: 49_412.77 },
      ],
    },
    { chain: "Prime", rows: [{ c: "AP3X", v: 53_305_435.47 }] },
    {
      chain: "Vector",
      rows: [
        { c: "xADA", v: 10_543.53 },
        { c: "AP3X", v: 28.12 },
      ],
    },
  ],
};

const EVM: WorldData = {
  key: "evm",
  name: "EVM World",
  tag: "Nexus · Base · BSC",
  summaryLocked: [{ c: "AP3X", v: 15_130_179.88 }],
  summaryBridged: [{ c: "AP3X", v: 55_296_927.66 }],
  lockedChain: [{ chain: "Nexus", rows: [{ c: "AP3X", v: 15_130_179.88 }] }],
  bridgedChain: [
    {
      chain: "Nexus",
      rows: [
        { c: "AP3X", v: 33_992_406.96 },
        { c: "xADA", v: 2.0 },
      ],
    },
    { chain: "Base", rows: [{ c: "bAP3X", v: 21_304_419.59 }] },
    { chain: "BSC", rows: [{ c: "bnAP3X", v: 101.1 }] },
  ],
};

// Totals across the whole network (from design)
const TOTAL_LOCKED_USD = sumUsd(UTXO.lockedChain) + sumUsd(EVM.lockedChain);
const TOTAL_BRIDGED_USD = sumUsd(UTXO.bridgedChain) + sumUsd(EVM.bridgedChain);

function sumUsd(chains: ChainRows[]) {
  return chains.reduce(
    (s, ch) => s + ch.rows.reduce((a, r) => a + r.v * (PRICE[r.c] ?? 0), 0),
    0,
  );
}
function usdOfRows(rows: CoinRow[]) {
  return rows.reduce((s, r) => s + r.v * (PRICE[r.c] ?? 0), 0);
}

type Mode = "overview" | "full";
type WorldKey = "utxo" | "evm";

// ── Formatting ────────────────────────────────────────────────────────
const fmtUsdCompact = (n: number) =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(1)}K`
        : `$${n.toFixed(2)}`;
const fmtUsdFull = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
const fmtTok = (n: number) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
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

// ── Charts (illustrative) ─────────────────────────────────────────────
function sparkPath(points: number[], w = 120, h = 34) {
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
const TVL_SPARK = [
  4.2, 4.6, 4.5, 5.1, 5.4, 5.2, 5.8, 6.3, 6.1, 6.8, 7.2, 7.0, 7.6, 8.1,
];
const TVB_SPARK = [
  3.1, 3.4, 3.8, 4.2, 4.0, 4.6, 5.1, 5.4, 5.8, 6.2, 6.7, 7.1, 7.6, 8.4,
];

const CHART_DAYS = 30;
const CHART_W = 900;
const CHART_H = 220;
function makeSeries(seed: number, base: number) {
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < CHART_DAYS; i++) {
    v +=
      Math.sin((i + seed) * 0.42) * base * 0.04 +
      Math.cos(i * 0.7 + seed) * base * 0.015;
    arr.push(Math.max(v, base * 0.6));
  }
  return arr;
}
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

function AuditPage() {
  const [mode, setMode] = useState<Mode>("overview");
  const [world, setWorld] = useState<WorldKey>("utxo");
  const [range, setRange] = useState<"7D" | "30D" | "90D">("30D");

  const data = world === "utxo" ? UTXO : EVM;

  const chart = useMemo(() => {
    const tvl = makeSeries(3, 60);
    const tvb = makeSeries(9, 45);
    const yMax = Math.max(...tvl, ...tvb) * 1.1;
    return {
      tvl: areaAndLine(tvl, 0, yMax),
      tvb: areaAndLine(tvb, 0, yMax),
    };
  }, []);

  // Donut: locked composition by chain (USD)
  const donut = useMemo(() => {
    const perChain = data.lockedChain.map((ch) => ({
      label: ch.chain,
      color: CHAIN_COLOR[ch.chain] ?? "#3B92FF",
      usd: ch.rows.reduce((s, r) => s + r.v * (PRICE[r.c] ?? 0), 0),
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
  }, [data]);

  // Bars: bridged distribution by chain (USD)
  const bars = useMemo(() => {
    const perChain = data.bridgedChain.map((ch) => ({
      label: ch.chain,
      color: CHAIN_COLOR[ch.chain] ?? "#3B92FF",
      usd: ch.rows.reduce((s, r) => s + r.v * (PRICE[r.c] ?? 0), 0),
    }));
    const total = perChain.reduce((s, x) => s + x.usd, 0) || 1;
    return perChain.map((b) => ({
      ...b,
      width: `${((b.usd / total) * 100).toFixed(1)}%`,
    }));
  }, [data]);

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
            <img src={logoAsset} alt="Skyline" className="h-8 w-auto md:h-9" />
          </Link>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 md:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.72_0.19_245)]">
              Skyline Bridge · Proof of Reserves
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/bridge-app"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Bridge
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
          {/* Hero */}
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.85_0.15_235)]">
              Skyline Bridge · Proof of Reserves
            </div>
            <h1 className="text-gradient-sky mt-4 text-balance font-display text-4xl font-semibold leading-[1.02] md:text-5xl">
              Every asset, fully accounted for.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              A live, public ledger of everything locked in and moved across the
              Skyline network — spanning Cardano, Apex Fusion and EVM chains,
              verifiable on-chain and updated continuously.
            </p>
          </div>

          {/* TVL / TVB cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Total Value Locked · TVL"
              usd={TOTAL_LOCKED_USD}
              delta="+2.4%"
              deltaLabel="7d"
              accent="#3B92FF"
              spark={TVL_SPARK}
              note="Assets held in Skyline's audited lock contracts, fully redeemable 1:1."
              tokens={["AP3X", "cAP3X", "ADA", "xADA"]}
            />
            <MetricCard
              label="Total Value Bridged · TVB"
              usd={TOTAL_BRIDGED_USD}
              delta="+5.1%"
              deltaLabel="7d"
              accent="#22C1E4"
              spark={TVB_SPARK}
              note="Cumulative value transferred across every supported chain since launch."
              tokens={["AP3X", "cAP3X", "bAP3X", "bnAP3X", "ADA", "xADA"]}
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
                  Rolling {range} view · illustrative history
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Legend color="#3B92FF" label="TVL" />
                <Legend color="#22C1E4" label="TVB" />
                <div className="inline-flex gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                  {(["7D", "30D", "90D"] as const).map((r) => (
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
              <span>30 days ago</span>
              <span>15 days ago</span>
              <span>Today</span>
            </div>
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

          {/* World tabs */}
          <div className="mt-8 flex items-end gap-6 border-b border-white/10">
            {(["utxo", "evm"] as WorldKey[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWorld(w)}
                className={`relative pb-3 text-sm font-semibold transition-colors ${
                  world === w
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w === "utxo" ? "UTxO World" : "EVM World"}
                {world === w && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[oklch(0.72_0.19_245)]" />
                )}
              </button>
            ))}
            <span className="ml-auto pb-3 text-xs text-muted-foreground">
              {mode === "overview"
                ? `${data.tag} · snapshot, updated continuously`
                : "Every value, straight from chain state"}
            </span>
          </div>

          {mode === "overview" ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <div className="flex flex-col gap-4">
                <SummaryCard
                  title="Total Locked"
                  rows={data.summaryLocked}
                  note={data.lockedNote}
                />
                <SummaryCard title="Total Bridged" rows={data.summaryBridged} />
              </div>

              <div className="card-glow rounded-2xl p-5 md:p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Locked composition · by chain
                </div>
                <div className="mt-4 flex items-center gap-5">
                  <svg
                    width="132"
                    height="132"
                    viewBox="0 0 120 120"
                    className="flex-none"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="15"
                    />
                    {donut.map((seg, i) => (
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
                  <div className="flex flex-1 flex-col gap-2">
                    {donut.map((seg, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[13px] font-medium"
                      >
                        <span
                          className="h-2.5 w-2.5 flex-none rounded-full"
                          style={{ background: seg.color }}
                        />
                        <span className="flex-1 truncate">{seg.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {(seg.pct * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Bridged distribution · by chain
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {bars.map((b, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-medium">
                          <span>{b.label}</span>
                          <span className="tabular-nums text-muted-foreground">
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
                </div>
              </div>
            </div>
          ) : (
            (() => {
              // Union of chain names, preserving locked order first
              const chainOrder: string[] = [];
              for (const c of data.lockedChain)
                if (!chainOrder.includes(c.chain)) chainOrder.push(c.chain);
              for (const c of data.bridgedChain)
                if (!chainOrder.includes(c.chain)) chainOrder.push(c.chain);
              const lockedByChain = new Map(
                data.lockedChain.map((c) => [c.chain, c]),
              );
              const bridgedByChain = new Map(
                data.bridgedChain.map((c) => [c.chain, c]),
              );
              return (
                <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
                  {/* Row 1 — summary cards */}
                  <SummaryOnly title="Total Locked" rows={data.summaryLocked} />
                  <SummaryOnly
                    title="Total Bridged"
                    rows={data.summaryBridged}
                  />

                  {/* Row 2 — note band (spacer keeps right col aligned) */}
                  <NoteBand note={data.lockedNote} />
                  <NoteBand />

                  {/* Row 3 — per-chain headers */}
                  <SectionLabel>Total Locked Per Chain</SectionLabel>
                  <SectionLabel>Total Bridged Per Chain</SectionLabel>

                  {/* Rows 4..N — chain pairs, one grid row per chain */}
                  {chainOrder.map((chain) => (
                    <div key={chain} className="contents">
                      <ChainCard
                        chain={chain}
                        rows={lockedByChain.get(chain)?.rows}
                      />
                      <ChainCard
                        chain={chain}
                        rows={bridgedByChain.get(chain)?.rows}
                      />
                    </div>
                  ))}
                </div>
              );
            })()
          )}

          {/*<div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[oklch(0.85_0.15_235)]" />
              Updated 2m ago · figures verified against on-chain state ·{" "}
              <span className="tabular-nums">
                AP3X ${AP3X_USD.toFixed(5)} · ADA ${ADA_USD.toFixed(4)}
              </span>
            </div>
            <a href="#" className="inline-flex items-center gap-1.5 text-[oklch(0.85_0.15_235)] hover:underline">
              View on-chain contracts <ExternalLink className="h-3 w-3" />
            </a>
          </div>*/}
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
          <Link
            to="/bridge-app"
            className="text-[oklch(0.85_0.15_235)] hover:underline md:flex-1 md:text-right"
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
  delta,
  deltaLabel,
  accent,
  spark,
  note,
  tokens,
}: {
  label: string;
  usd: number;
  delta: string;
  deltaLabel: string;
  accent: string;
  spark: number[];
  note: string;
  tokens: string[];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 p-6"
      style={{
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.02))`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="rounded-md bg-[oklch(0.75_0.18_155_/_0.15)] px-2 py-1 text-[10px] font-semibold text-[oklch(0.85_0.18_155)]">
          ▲ {delta} · {deltaLabel}
        </span>
      </div>
      <div className="mt-4 font-display text-4xl font-bold tabular-nums leading-none">
        {fmtUsdFull(useCountUp(usd))}
      </div>

      <div className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {note}
      </div>
      <svg
        width="120"
        height="34"
        viewBox="0 0 120 34"
        className="absolute bottom-5 right-5 opacity-90"
      >
        <path
          d={sparkPath(spark)}
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
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

function SummaryCard({
  title,
  rows,
  note,
}: {
  title: string;
  rows: CoinRow[];
  note?: string;
}) {
  const totalUsd = usdOfRows(rows);
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
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <span className="inline-flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: COIN_COLOR[row.c] ?? "#3B92FF" }}
              />
              <span className="text-sm font-semibold">{row.c}</span>
            </span>
            <span className="text-right">
              <span className="font-display text-base font-semibold tabular-nums">
                {fmtTok(row.v)}
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {fmtUsdCompact(row.v * (PRICE[row.c] ?? 0))}
              </span>
            </span>
          </div>
        ))}
      </div>
      {note && (
        <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {note}
        </div>
      )}
    </div>
  );
}

function SummaryOnly({ title, rows }: { title: string; rows: CoinRow[] }) {
  const totalUsd = usdOfRows(rows);
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
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: COIN_COLOR[row.c] ?? "#3B92FF" }}
              />
              {row.c}
            </span>
            <span className="text-right tabular-nums">
              <span className="font-semibold">{fmtTok(row.v)}</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {fmtUsdCompact(row.v * (PRICE[row.c] ?? 0))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBand({ note }: { note?: string }) {
  // When there's no note, render an invisible placeholder of the same shape so
  // the sibling column stays vertically aligned in the shared grid row.
  return (
    <div
      className={`rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground ${
        note ? "" : "invisible"
      }`}
      aria-hidden={!note}
    >
      {note ?? "placeholder"}
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

function ChainCard({ chain, rows }: { chain: string; rows?: CoinRow[] }) {
  if (!rows) {
    // Empty slot: keeps the grid row height honest so the paired card aligns.
    return <div aria-hidden className="hidden lg:block" />;
  }
  const icon = CHAIN_ICON[chain];
  const chainUsd = rows.reduce((s, r) => s + r.v * (PRICE[r.c] ?? 0), 0);
  return (
    <div className="card-glow rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          {icon ? (
            <img src={icon} alt={chain} className="h-6 w-6 rounded-full" />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: CHAIN_COLOR[chain] ?? "#3B92FF" }}
            />
          )}
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: CHAIN_COLOR[chain] ?? "#3B92FF" }}
          >
            {chain}
          </span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtUsdCompact(chainUsd)}
        </span>
      </div>
      <div className="mt-2 divide-y divide-white/5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 text-[13px]"
          >
            <span className="text-muted-foreground">{row.c}</span>
            <span className="text-right tabular-nums">
              <span>{fmtTok(row.v)}</span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                {fmtUsdCompact(row.v * (PRICE[row.c] ?? 0))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
