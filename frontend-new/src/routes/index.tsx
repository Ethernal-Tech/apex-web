import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Bot,
  Landmark,
  Menu,
  X,
  ShieldCheck,
  Zap,
  Globe2,
  Boxes,
  Coins,
  CircleDollarSign,
  Euro,
  Layers,
  Hexagon,
  Binary,
  Waves,
  Sparkles,
} from "lucide-react";
import { FooterSocials } from "@/components/ui/footer-socials";
import { AssetIcon } from "@/components/ui/asset-icon";
import { settingsQueryOptions } from "@/lib/api/settings";
import { landingStatsQueryOptions } from "@/lib/api/stats";
import { useBridgeStats } from "@/hooks/use-bridge-stats";
import { formatUsdCompact } from "@/lib/usd";
import { getEnabledChainNodes } from "@/lib/chains";
import { useChainInfos } from "@/hooks/use-chain-infos";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import {
  ETHERNAL_GITHUB_URL,
  externalAnchorProps,
  SKYLINE_DOCUMENTATION_URL,
} from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Landing,
});

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

function Header() {
  const [open, setOpen] = useState(false);
  const { tvlUsd, tvbUsd } = useBridgeStats();
  const tvl = formatUsdCompact(tvlUsd);
  const tvb = formatUsdCompact(tvbUsd);
  const nav = [
    { label: "Ecosystem", href: "#ecosystem" },
    { label: "Roadmap", href: "#roadmap" },
    { label: "Docs", href: SKYLINE_DOCUMENTATION_URL },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-8">
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
        <nav className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-9 min-[1130px]:flex">
          {nav.map((n) => (
            <a
              key={n.label}
              href={n.href}
              {...externalAnchorProps(n.href)}
              className="pointer-events-auto text-[15px] font-medium text-foreground/90 transition-colors hover:text-[oklch(0.85_0.15_235)]"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 min-[875px]:max-[1129px]:flex">
          <Link
            to="/audit"
            title="View full audit"
            aria-label="View full audit"
            className="group pointer-events-auto"
          >
            <StatChip label="TVL" value={tvl} interactive />
          </Link>
          <Link
            to="/audit"
            title="View full audit"
            aria-label="View full audit"
            className="group pointer-events-auto"
          >
            <StatChip label="TVB" value={tvb} interactive />
          </Link>
        </div>

        <div className="hidden items-center justify-end gap-2 min-[1130px]:flex">
          <Link
            to="/audit"
            title="View full audit"
            aria-label="View full audit"
            className="group pointer-events-auto inline-flex"
          >
            <StatChip label="TVL" value={tvl} interactive />
          </Link>
          <Link
            to="/audit"
            title="View full audit"
            aria-label="View full audit"
            className="group pointer-events-auto inline-flex"
          >
            <StatChip label="TVB" value={tvb} interactive />
          </Link>
          <a
            href="/bridge-app"
            className="btn-primary-glow ml-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          >
            Open Bridge <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground min-[1130px]:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile stats — below the logo so they never overlap it */}
      <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[875px]:hidden">
        <Link to="/audit" title="View full audit" aria-label="View full audit">
          <StatChip label="TVL" value={tvl} compact interactive />
        </Link>
        <Link to="/audit" title="View full audit" aria-label="View full audit">
          <StatChip label="TVB" value={tvb} compact interactive />
        </Link>
      </div>
      {open && (
        <div className="border-t border-white/5 bg-background/95 min-[1130px]:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {nav.map((n) => (
              <a
                key={n.label}
                href={n.href}
                {...externalAnchorProps(n.href)}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <a
              href="/bridge-app"
              className="btn-primary-glow mt-2 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              Open Bridge <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const { data: settings } = useQuery(settingsQueryOptions);
  const { tvbUsd } = useBridgeStats();
  const chainsConnected = settings?.enabledChains.length;
  const tokensEnabled = settings?.ecosystemTokens.length;

  const stats = [
    {
      label: "Chains connected",
      value: chainsConnected != null ? String(chainsConnected) : "—",
    },
    // TODO: update with actual number of apps
    { label: "Skyline apps", value: "3+" },
    { label: "TVB", value: formatUsdCompact(tvbUsd) },
    {
      label: "DIFFERENT TOKENS",
      value: tokensEnabled != null ? String(tokensEnabled) : "—",
    },
  ];

  return (
    <section className="bg-hero-glow relative overflow-hidden">
      {/* Signature Skyline arc */}
      <div className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2">
        <div className="relative h-8 w-[1400px] max-w-[140vw]">
          <div
            className="absolute inset-x-0 top-1/2 h-[2px] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(0.55 0.22 250 / 0.4) 25%, oklch(0.95 0.15 230) 50%, oklch(0.55 0.22 250 / 0.4) 75%, transparent 100%)",
              filter: "blur(0.5px)",
              transform: "translateY(-50%) scaleY(0.35)",
              borderRadius: "50%",
            }}
          />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_4px_oklch(0.85_0.18_235_/_0.8)]" />
        </div>
      </div>

      <div className="container-page relative z-10 pb-24 pt-24 md:pb-36 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.18_235)] shadow-[0_0_8px_oklch(0.85_0.18_235)]" />
            Bridge is live — AI &amp; TradFi rails coming soon
          </div>
          <h1 className="text-gradient-sky text-balance text-5xl font-semibold leading-[1.05] md:text-7xl">
            One skyline
            <br />
            across every chain.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            Move assets between blockchains in seconds. Soon, let AI agents
            settle on your behalf and reach the dollar economy through Stripe
            and stablecoins — all from one horizon.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/bridge-app"
              className="btn-primary-glow inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            >
              Launch Bridge <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#ecosystem"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
            >
              Explore ecosystem
            </a>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-background/80 p-5 text-center backdrop-blur"
            >
              <div className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const { data: settings } = useQuery(settingsQueryOptions);
  const chainsConnected = settings?.enabledChains.length;
  const chainsLabel = chainsConnected != null ? String(chainsConnected) : "—";

  const pillars = [
    {
      id: "bridge",
      status: "Live now",
      statusTone: "live" as const,
      icon: ArrowLeftRight,
      title: "Cross-chain Bridge",
      description: `Move native assets across ${chainsLabel} chains in one click. Native bridging across UTXO, EVM, and SVM chains. Batched, signature-verified settlement. No swaps, no slippage, no wrapped-asset guesswork.`,
      bullets: [
        "One bridge across three VMs.",
        "Batched settlement, lower fees.",
        "Every transfer verified by validators on-chain.",
      ],
      cta: "Open Bridge",
    },
    {
      id: "agents",
      status: "Coming Q2",
      statusTone: "soon" as const,
      icon: Bot,
      title: "AI Agentic Finance",
      description:
        "Delegate on-chain strategies to autonomous agents. Set intent — rebalance, yield-farm, or DCA — and let Skyline execute across every chain, 24/7.",
      bullets: [
        "Intent-based execution",
        "Programmable guardrails",
        "Composable strategy market",
      ],
      cta: "Join waitlist",
    },
    {
      id: "tradfi",
      status: "Coming soon",
      statusTone: "soon" as const,
      icon: Landmark,
      title: "TradFi Connector",
      description:
        "Bridge on-chain liquidity to the real dollar economy. Off-ramp via Stripe and settle in regulated stablecoins — with the compliance stack built in.",
      bullets: [
        "Stripe payouts & payments",
        "Stablecoin settlement (USDC, PYUSD)",
        "KYB / KYC-ready flows",
      ],
      cta: "Talk to us",
    },
  ];

  return (
    <section id="ecosystem" className="relative py-24 md:py-32">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.13_240)]">
            The Skyline Stack
          </div>
          <h2 className="text-balance text-4xl font-semibold md:text-5xl">
            Three rails. <span className="text-gradient-sky">One horizon.</span>
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Built as a modular network — start with the bridge you need today,
            and grow into the AI and fiat rails as they land.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className="card-glow group relative flex flex-col rounded-2xl p-6 md:p-7"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.72_0.19_245)] to-[oklch(0.4_0.22_265)] shadow-[0_10px_30px_-10px_oklch(0.55_0.22_250_/_0.7)]">
                  <p.icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <span
                  className={
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " +
                    (p.statusTone === "live"
                      ? "border-[oklch(0.72_0.19_245_/_0.5)] bg-[oklch(0.72_0.19_245_/_0.15)] text-[oklch(0.9_0.12_235)]"
                      : "border-white/10 bg-white/5 text-muted-foreground")
                  }
                >
                  {p.status}
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {p.description}
              </p>
              <ul className="mt-6 space-y-2">
                {p.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-foreground/80"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[oklch(0.78_0.13_240)]" />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <a
                  href={p.id === "bridge" ? "/bridge-app" : "/contact"}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-[oklch(0.85_0.15_235)]"
                >
                  {p.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** `1.24M` — a plain count, in the same shorthand as the USD figures. */
function formatCountCompact(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";

  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

function Analytics() {
  const { data: settings } = useQuery(settingsQueryOptions);
  // The same figures the header reports, so the page cannot contradict itself.
  const { tvlUsd, tvbUsd } = useBridgeStats();
  const { data: landingStats } = useQuery(landingStatsQueryOptions);
  const chainsConnected = settings?.enabledChains.length;

  const stats = {
    tvl: formatUsdCompact(tvlUsd),
    tvb: formatUsdCompact(tvbUsd),
    transactions: formatCountCompact(landingStats?.bridgingTransactions),
    chains: chainsConnected != null ? String(chainsConnected) : "—",
  };

  return (
    <section
      id="analytics"
      className="relative border-y border-white/5 bg-[oklch(0.15_0.03_260)] py-24 md:py-32"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.13_240)]">
            Network overview
          </div>
          <h2 className="text-balance text-4xl font-semibold md:text-5xl">
            Trusted across the{" "}
            <span className="text-gradient-sky">Skyline network</span>
          </h2>
        </div>

        {/* TVL hero stat */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[oklch(0.2_0.04_262)] to-[oklch(0.15_0.03_260)] p-10 text-center md:p-14">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />
            <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.85_0.15_235_/_0.15)] blur-3xl" />
            <div className="relative">
              <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Total value locked
              </div>
              <div className="mt-2 font-display text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
                {stats.tvl}
              </div>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total value bridged", value: stats.tvb },
              { label: "Total transactions", value: stats.transactions },
              { label: "Chains connected", value: stats.chains },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-[oklch(0.17_0.03_262)] p-6 text-center transition-colors hover:border-[oklch(0.72_0.19_245_/_0.4)]"
              >
                <div className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type OrbitNode = {
  icon?: typeof Bot;
  img?: string;
  label: string;
  tone: "primary" | "muted";
};

function Orbit({
  duration,
  reverse,
  nodes,
  ringOpacity,
  size,
  width,
  height,
  tilt = 0,
}: {
  duration: number;
  reverse?: boolean;
  nodes: OrbitNode[];
  ringOpacity: number;
  size?: number;
  width?: number;
  height?: number;
  tilt?: number;
}) {
  const w = size ?? width ?? 0;
  const h = size ?? height ?? w;
  // Vertical squash factor: 1 = circle, < 1 = ellipse. The rotation runs in a
  // square w×w space and gets flattened by scaleY(squash) so nodes travel the
  // actual ellipse instead of rigid circles around statically-placed points.
  const squash = w > 0 ? h / w : 1;
  const unsquash = squash !== 0 ? 1 / squash : 1;
  const count = nodes.length;
  const spin = `${reverse ? "skyline-orbit-spin-reverse" : "skyline-orbit-spin"} ${duration}s linear infinite`;
  const counterSpin = `${reverse ? "skyline-orbit-spin" : "skyline-orbit-spin-reverse"} ${duration}s linear infinite`;

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {/* Ring — borderRadius must be 50%: rounded-full (9999px) turns a
          non-square box into a pill with straight sides, not an ellipse */}
      <div
        className="absolute inset-0 border"
        style={{
          borderRadius: "50%",
          borderColor: `oklch(0.72 0.19 245 / ${ringOpacity})`,
          boxShadow: `inset 0 0 40px oklch(0.55 0.22 250 / ${ringOpacity * 0.6}), 0 0 30px oklch(0.55 0.22 250 / ${ringOpacity * 0.25})`,
          animation: "skyline-pulse-ring 6s ease-in-out infinite",
        }}
      />

      {/* Squash wrapper: circular rotation happens in a square space, then the
          whole space is flattened vertically into the ellipse */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: w,
          height: w,
          marginLeft: -w / 2,
          marginTop: -w / 2,
          transform: `scaleY(${squash})`,
        }}
      >
        {/* Rotating layer with nodes */}
        <div className="absolute inset-0" style={{ animation: spin }}>
          {nodes.map((n, i) => {
            const angle = (i / count) * 360;
            const isPrimary = n.tone === "primary";
            return (
              <div
                key={n.label + i}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `rotate(${angle}deg) translate(${w / 2}px) rotate(-${angle}deg)`,
                }}
              >
                {/* Zero-size pivot: counter-rotates the spin exactly around the
                    orbital point so content stays put and upright */}
                <div
                  className="relative h-0 w-0"
                  style={{ animation: counterSpin }}
                >
                  {/* Center content on the pivot, undo the squash, undo the tilt.
                      Order matters — the parent chain rotate(tilt) · scaleY(squash)
                      inverts as scaleY(1/squash) · rotate(-tilt); swapping them
                      shears the icons because scale and rotate don't commute */}
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      transform: `translate(-50%, -50%) scaleY(${unsquash}) rotate(${-tilt}deg)`,
                    }}
                  >
                    {isPrimary ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[oklch(0.72_0.19_245_/_0.5)] bg-gradient-to-br from-[oklch(0.72_0.19_245)] to-[oklch(0.4_0.22_265)] shadow-[0_10px_30px_-6px_oklch(0.55_0.22_250_/_0.7)]">
                          {n.img ? (
                            <AssetIcon
                              src={n.img}
                              alt={n.label}
                              className="h-7 w-7"
                            />
                          ) : n.icon ? (
                            <n.icon
                              className="h-6 w-6 text-white"
                              strokeWidth={2}
                            />
                          ) : null}
                        </div>
                        <div className="rounded-full border border-white/10 bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                          {n.label}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[oklch(0.85_0.15_235)] backdrop-blur"
                        title={n.label}
                        aria-label={n.label}
                      >
                        {n.img ? (
                          <AssetIcon
                            src={n.img}
                            alt={n.label}
                            className="h-5 w-5"
                          />
                        ) : n.icon ? (
                          <n.icon className="h-4 w-4" strokeWidth={1.8} />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Connecting() {
  const ellipseMode = true;
  const { data: settings } = useQuery(settingsQueryOptions);
  // getEnabledChainNodes reads the chain display registry this query populates.
  useChainInfos();
  const chainsConnected = settings?.enabledChains.length;
  const bridgeRing: OrbitNode[] = [
    { icon: ArrowLeftRight, label: "Bridge", tone: "primary" },
    ...getEnabledChainNodes(settings?.enabledChains).map((c) => ({
      img: c.img,
      label: c.label,
      tone: "muted" as const,
    })),
  ];
  const agentRing: OrbitNode[] = [
    { icon: Bot, label: "AI Agents", tone: "primary" },
    { icon: Sparkles, label: "Intents", tone: "muted" },
    { icon: Zap, label: "Auto-exec", tone: "muted" },
    { icon: ShieldCheck, label: "Guardrails", tone: "muted" },
  ];
  const tradfiRing: OrbitNode[] = [
    { icon: Landmark, label: "TradFi", tone: "primary" },
    { icon: Coins, label: "Stripe", tone: "muted" },
    { icon: CircleDollarSign, label: "USDC", tone: "muted" },
    { icon: Euro, label: "EUR", tone: "muted" },
  ];

  return (
    <section
      id="connecting"
      className="relative overflow-hidden py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-40" />
      <div className="container-page relative">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.13_240)]">
            Connecting everything
          </div>
          <h2 className="text-balance text-4xl font-semibold md:text-5xl">
            One hub. <span className="text-gradient-sky">Every rail.</span>
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Skyline unifies chains, autonomous agents, and the dollar economy
            into a single interoperable network.
          </p>
        </div>

        <div className="relative z-0 mx-auto mt-16 aspect-square w-full max-w-[720px]">
          {/* Soft background glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.18)] blur-3xl" />

          {/* Orbits */}
          {ellipseMode ? (
            <>
              <Orbit
                width={650}
                height={400}
                tilt={45}
                duration={90}
                reverse
                nodes={tradfiRing}
                ringOpacity={0.28}
              />
              <Orbit
                width={650}
                height={400}
                tilt={-45}
                duration={60}
                nodes={agentRing}
                ringOpacity={0.28}
              />
              <Orbit
                size={280}
                duration={35}
                reverse
                nodes={bridgeRing}
                ringOpacity={0.4}
              />
            </>
          ) : (
            <>
              <Orbit
                size={640}
                duration={90}
                reverse
                nodes={tradfiRing}
                ringOpacity={0.18}
              />
              <Orbit
                size={460}
                duration={60}
                nodes={agentRing}
                ringOpacity={0.28}
              />
              <Orbit
                size={280}
                duration={35}
                reverse
                nodes={bridgeRing}
                ringOpacity={0.4}
              />
            </>
          )}

          {/* Central hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[oklch(0.28_0.05_262)] to-[oklch(0.14_0.03_260)] backdrop-blur"
              style={{ animation: "skyline-hub-glow 4s ease-in-out infinite" }}
            >
              <img
                src={logoAsset}
                alt="Skyline"
                className="h-full w-full object-contain p-1.5"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            {
              label: "Bridge",
              body:
                chainsConnected != null
                  ? `${chainsConnected} chains, one click.`
                  : "— chains, one click.",
            },
            { label: "AI Agents", body: "Intents that settle themselves." },
            { label: "TradFi", body: "Stripe & stablecoin rails." },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center backdrop-blur"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.85_0.15_235)]">
                {c.label}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  const { data: settings } = useQuery(settingsQueryOptions);
  const chainsConnected = settings?.enabledChains.length;
  const tokensEnabled = settings?.ecosystemTokens.length;
  const chainsLabel = chainsConnected != null ? String(chainsConnected) : "—";
  const tokensLabel = tokensEnabled != null ? String(tokensEnabled) : "—";

  const items = [
    {
      q: "Now",
      title: "Bridge Mainnet",
      body: `${chainsLabel} chains, ${tokensLabel} native assets, validator protected routing.`,
    },
    {
      q: "Q3 2026",
      title: "Agent SDK Alpha",
      body: "Publish and subscribe to on-chain strategies with programmable guardrails.",
    },
    {
      q: "Q1 2027",
      title: "Stripe & Stablecoin Rails",
      body: "On/off-ramp via Stripe, settlement in USDC and PYUSD, KYB-ready.",
    },
    {
      q: "Q2 2027",
      title: "Skyline Network v2",
      body: "Unified intent layer across chains, agents, and fiat rails.",
    },
  ];
  return (
    <section id="roadmap" className="relative py-24 md:py-32">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.13_240)]">
            Roadmap
          </div>
          <h2 className="text-balance text-4xl font-semibold md:text-5xl">
            Building toward the horizon.
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <ol className="relative border-l border-white/10 pl-8">
            {items.map((it, i) => (
              <li
                key={it.title}
                className={i !== items.length - 1 ? "pb-10" : ""}
              >
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-[oklch(0.85_0.15_235)] shadow-[0_0_16px_oklch(0.85_0.15_235)]" />
                <div className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.78_0.13_240)]">
                  {it.q}
                </div>
                <h3 className="mt-1 font-display text-xl font-semibold text-foreground">
                  {it.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    {
      icon: ArrowLeftRight,
      title: "Seamless Interoperability",
      body: "Connect assets, applications, and communities across multiple blockchains. Skyline unlocks new possibilities for cross-chain innovation.",
    },
    {
      icon: ShieldCheck,
      title: "Decentralized Security",
      body: "Powered by a multi-signature validation system, Skyline ensures trust and protection with every transaction.",
    },
    {
      icon: Zap,
      title: "Scalable and Efficient",
      body: "Skyline batches transactions for optimized speed and cost-effectiveness, enabling smooth asset transfers for any ecosystem.",
    },
  ];
  return (
    <section className="border-t border-white/5 bg-[oklch(0.16_0.032_262)] py-24 md:py-28">
      <div className="container-page grid gap-10 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.title}>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <i.icon className="h-5 w-5 text-[oklch(0.85_0.15_235)]" />
            </div>
            <h3 className="font-display text-lg font-semibold">{i.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{i.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <div className="bg-hero-glow absolute inset-0 opacity-70" />
      <div className="container-page relative text-center">
        <h2 className="text-balance font-display text-4xl font-semibold md:text-6xl">
          <span className="text-gradient-sky">Cross the horizon.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Start bridging in seconds. Be first in line for AI agents and fiat
          rails.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/bridge-app"
            className="btn-primary-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Launch Bridge <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium hover:bg-white/[0.06]"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container-page py-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm">
            <div className="font-display text-lg font-semibold tracking-[0.3em] text-foreground">
              SKYLINE
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The universal bridge between chains, agents, and the dollar
              economy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {[
              {
                title: "Product",
                links: [
                  { label: "Bridge", href: "/bridge-app" },
                  { label: "Agents", href: "#" },
                  { label: "TradFi", href: "#" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { label: "Docs", href: SKYLINE_DOCUMENTATION_URL },
                  { label: "GitHub", href: ETHERNAL_GITHUB_URL },
                ],
              },
              {
                title: "Connect",
                links: [
                  { label: "Who We Are", href: "/about-us" },
                  { label: "Get in Touch", href: "/contact" },
                ],
              },
            ].map((c) => (
              <div key={c.title}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                  {c.title}
                </div>
                <ul className="space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...externalAnchorProps(l.href)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Skyline. All rights reserved.</div>
          <FooterSocials />
        </div>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Pillars />
        <Analytics />
        <Connecting />
        <Roadmap />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
