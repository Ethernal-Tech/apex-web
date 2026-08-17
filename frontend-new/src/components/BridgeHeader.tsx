import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBridgeStats } from "@/hooks/use-bridge-stats";
import { formatUsdCompact, formatUsdFull } from "@/lib/usd";
import { externalAnchorProps, SKYLINE_DOCUMENTATION_URL } from "@/lib/utils";

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

const menuLinkClass =
  "rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground";

export function BridgeHeader({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCompact = useMediaQuery("(max-width: 1000px)");
  const { tvlUsd, tvbUsd } = useBridgeStats();

  return (
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
          <div className="hidden items-center gap-3 md:flex">{children}</div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/5 bg-background/95 md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link
              to="/transactions"
              onClick={() => setMenuOpen(false)}
              className={menuLinkClass}
            >
              History
            </Link>
            <Link
              to="/audit"
              onClick={() => setMenuOpen(false)}
              className={menuLinkClass}
            >
              Audit
            </Link>
            <a
              href={SKYLINE_DOCUMENTATION_URL}
              {...externalAnchorProps(SKYLINE_DOCUMENTATION_URL)}
              onClick={() => setMenuOpen(false)}
              className={menuLinkClass}
            >
              Docs
            </a>
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[875px]:hidden">
        <Link
          to="/audit"
          title="Open the full proof-of-reserves audit"
          aria-label="Open audit"
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
  );
}
