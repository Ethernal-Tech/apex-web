import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

function newTransactionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkBadge, NetworkToggle } from "@/components/NetworkToggle";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowDown,
  ArrowLeftRight,
  ChevronDown,
  Wallet,
  ExternalLink,
  Search,
  Check,
  Star,
  Sparkles,
  X,
  HelpCircle,
  Copy,
  Clipboard,
  AlertCircle,
  History,
} from "lucide-react";
import logoAsset from "@/assets/skyline-logo-transparent.png.asset.json";
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

export const Route = createFileRoute("/bridge-app")({
  head: () => ({
    meta: [
      { title: "Skyline Bridge — Move assets across chains" },
      {
        name: "description",
        content: "The Skyline Bridge app. Move native assets across 10+ chains in seconds.",
      },
    ],
  }),
  component: BridgeApp,
});

type Chain = {
  id: string;
  label: string;
  icon: string;
  category: "apex" | "utxo" | "evm" | "svm";
  status?: "live" | "soon";
  symbol?: string;
  popular?: boolean;
  apexFusion?: boolean;
};

const CHAINS: Chain[] = [
  {
    id: "prime",
    label: "Prime",
    icon: primeIcon,
    category: "utxo",
    status: "live",
    symbol: "AP3X",
    popular: true,
    apexFusion: true,
  },
  {
    id: "nexus",
    label: "Nexus",
    icon: nexusIcon,
    category: "evm",
    status: "live",
    symbol: "AP3X",
    popular: true,
    apexFusion: true,
  },
  {
    id: "vector",
    label: "Vector",
    icon: vectorIcon,
    category: "utxo",
    status: "live",
    symbol: "AP3X",
    popular: true,
    apexFusion: true,
  },
  { id: "eth", label: "Ethereum", icon: ethIcon, category: "evm", status: "soon", symbol: "ETH" },
  { id: "sol", label: "Solana", icon: solIcon, category: "svm", status: "soon", symbol: "SOL" },
  { id: "ada", label: "Cardano", icon: adaIcon, category: "utxo", status: "live", symbol: "ADA", popular: true },
  { id: "bnb", label: "BNB Chain", icon: bnbIcon, category: "evm", status: "live", symbol: "BNB" },
  { id: "sei", label: "Sei", icon: seiIcon, category: "evm", status: "soon", symbol: "SEI" },
  { id: "base", label: "Base", icon: baseIcon, category: "evm", status: "live", symbol: "ETH" },
  { id: "arb", label: "Arbitrum", icon: arbIcon, category: "evm", status: "soon", symbol: "ETH" },
  { id: "poly", label: "Polygon", icon: polyIcon, category: "evm", status: "soon", symbol: "POL" },
  { id: "uni", label: "Unichain", icon: uniIcon, category: "evm", status: "soon", symbol: "ETH" },
  { id: "scroll", label: "Scroll", icon: scrollIcon, category: "evm", status: "soon", symbol: "ETH" },
  { id: "katana", label: "Katana", icon: katanaIcon, category: "evm", status: "soon", symbol: "ETH" },
];

const CATEGORIES: { id: "all" | "popular" | "apex" | "utxo" | "evm" | "svm"; label: string }[] = [
  { id: "all", label: "All networks" },
  { id: "popular", label: "Popular" },
  { id: "apex", label: "Apex Fusion" },
  { id: "utxo", label: "UTXO" },
  { id: "evm", label: "EVM" },
  { id: "svm", label: "SVM" },
];

function ChainSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: Chain;
  onChange: (c: Chain) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)]"
      >
        <span className="flex items-center gap-3">
          <img src={value.icon} alt={value.label} className="h-8 w-8 rounded-full" />
          <span className="flex flex-col">
            <span className="font-medium text-foreground leading-tight">{value.label}</span>
            {value.symbol && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {value.symbol}
              </span>
            )}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
          Change <ChevronDown className="h-3 w-3" />
        </span>
      </button>
      <ChainPickerModal
        open={open}
        title={`Select ${label.toLowerCase()} network`}
        selectedId={value.id}
        excludeId={exclude}
        onClose={() => setOpen(false)}
        onSelect={(c) => {
          onChange(c);
          setOpen(false);
        }}
      />
    </div>
  );
}

function ChainPickerModal({
  open,
  title,
  selectedId,
  excludeId,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  selectedId: string;
  excludeId?: string;
  onClose: () => void;
  onSelect: (c: Chain) => void;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCat("all");
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAINS.filter((c) => {
      if (cat !== "all") {
        if (cat === "popular") {
          if (!c.popular) return false;
        } else if (cat === "apex") {
          if (!c.apexFusion && c.category !== "apex") return false;
        } else if (c.category !== cat) {
          return false;
        }
      }
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || (c.symbol?.toLowerCase().includes(q) ?? false) || c.id.includes(q);
    });
  }, [query, cat]);

  const live = filtered.filter((c) => c.status !== "soon");
  const soon = filtered.filter((c) => c.status === "soon");

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-[min(80vh,640px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.17_0.03_262)] shadow-[0_30px_80px_-20px_oklch(0.55_0.22_250_/_0.5)]"
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.7)] to-transparent" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_250_/_0.25),transparent_70%)]" />

        <div className="relative flex flex-none items-center justify-between px-6 pt-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[oklch(0.85_0.15_235)]">
              Networks
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-none px-6 pt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-[oklch(0.72_0.19_245_/_0.6)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 40+ networks or tokens…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  cat === c.id
                    ? "border-[oklch(0.72_0.19_245_/_0.6)] bg-[oklch(0.72_0.19_245_/_0.15)] text-foreground"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 pb-5">
            {live.length === 0 && soon.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No networks match "{query}".</div>
            )}

            {live.length > 0 && (
              <SectionHeader icon={<Sparkles className="h-3 w-3" />} label="Live now" count={live.length} />
            )}
            <ul className="grid gap-1">
              {live.map((c) => (
                <ChainRow
                  key={c.id}
                  chain={c}
                  selected={c.id === selectedId}
                  disabled={c.id === excludeId}
                  onSelect={() => onSelect(c)}
                />
              ))}
            </ul>

            {soon.length > 0 && (
              <>
                <SectionHeader icon={<Star className="h-3 w-3" />} label="Coming soon" count={soon.length} />
                <ul className="grid gap-1">
                  {soon.map((c) => (
                    <ChainRow key={c.id} chain={c} selected={false} disabled onSelect={() => {}} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="relative flex flex-none items-center justify-between border-t border-white/5 px-6 py-3 text-[11px] text-muted-foreground">
          <span>{CHAINS.length}+ networks · more integrations rolling out soon</span>
          <span className="hidden items-center gap-1 md:inline-flex">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="mb-1.5 mt-3 flex items-center gap-2 px-3">
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.85_0.15_235)]">
        {icon}
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">{count}</span>
      <span className="ml-1 h-px flex-1 bg-white/5" />
    </div>
  );
}

function ChainRow({
  chain,
  selected,
  disabled,
  onSelect,
}: {
  chain: Chain;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const isSoon = chain.status === "soon";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
          selected
            ? "border-[oklch(0.72_0.19_245_/_0.55)] bg-[oklch(0.72_0.19_245_/_0.12)]"
            : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
        } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
      >
        <span className="relative">
          <img src={chain.icon} alt={chain.label} className={`h-9 w-9 rounded-full ${isSoon ? "grayscale" : ""}`} />
          {selected && (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.85_0.15_235)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.17_0.03_262)]">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-foreground">{chain.label}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chain.symbol} ·{" "}
              {chain.apexFusion
                ? `Apex Fusion · ${chain.category.toUpperCase()}`
                : chain.category === "apex"
                  ? "Apex Fusion"
                  : chain.category === "utxo"
                    ? "UTXO"
                    : chain.category === "svm"
                      ? "SVM"
                      : "EVM"}
            </span>
          </span>
          {isSoon ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Soon
            </span>
          ) : disabled ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">In use</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.85_0.15_235)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.85_0.15_235)] shadow-[0_0_8px_oklch(0.85_0.15_235)]" />
              Live
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

type Token = {
  id: string;
  symbol: string;
  name: string;
  icon: string;
};

const TOKENS: Token[] = [
  { id: "ap3x", symbol: "AP3X", name: "Apex Fusion", icon: primeIcon },
  { id: "eth", symbol: "ETH", name: "Ethereum", icon: ethIcon },
  { id: "sol", symbol: "SOL", name: "Solana", icon: solIcon },
  { id: "ada", symbol: "ADA", name: "Cardano", icon: adaIcon },
  { id: "bnb", symbol: "BNB", name: "BNB", icon: bnbIcon },
  { id: "sei", symbol: "SEI", name: "Sei", icon: seiIcon },
  { id: "pol", symbol: "POL", name: "Polygon", icon: polyIcon },
];

function TokenSelect({ label, value, onChange }: { label: string; value: Token; onChange: (t: Token) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)]"
      >
        <span className="flex items-center gap-3">
          <img src={value.icon} alt={value.name} className="h-8 w-8 rounded-full" />
          <span className="flex flex-col">
            <span className="font-medium text-foreground leading-tight">{value.symbol}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {value.name}
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
          Change <ChevronDown className="h-3 w-3" />
        </span>
      </button>
      <TokenPickerModal
        open={open}
        title={`Select ${label.toLowerCase()}`}
        selectedId={value.id}
        onClose={() => setOpen(false)}
        onSelect={(t) => {
          onChange(t);
          setOpen(false);
        }}
      />
    </div>
  );
}

function TokenPickerModal({
  open,
  title,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  selectedId: string;
  onClose: () => void;
  onSelect: (t: Token) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOKENS;
    return TOKENS.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.id.includes(q),
    );
  }, [query]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-[min(80vh,640px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.17_0.03_262)] shadow-[0_30px_80px_-20px_oklch(0.55_0.22_250_/_0.5)]"
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.7)] to-transparent" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_250_/_0.25),transparent_70%)]" />

        <div className="relative flex flex-none items-center justify-between px-6 pt-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[oklch(0.85_0.15_235)]">Tokens</div>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-none px-6 pt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 focus-within:border-[oklch(0.72_0.19_245_/_0.6)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tokens…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 pb-5">
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No tokens match "{query}".</div>
            )}

            {filtered.length > 0 && (
              <SectionHeader icon={<Sparkles className="h-3 w-3" />} label="Available" count={filtered.length} />
            )}
            <ul className="grid gap-1">
              {filtered.map((t) => (
                <TokenRow key={t.id} token={t} selected={t.id === selectedId} onSelect={() => onSelect(t)} />
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex flex-none items-center justify-between border-t border-white/5 px-6 py-3 text-[11px] text-muted-foreground">
          <span>{TOKENS.length} tokens · more assets rolling out soon</span>
          <span className="hidden items-center gap-1 md:inline-flex">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TokenRow({ token, selected, onSelect }: { token: Token; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
          selected
            ? "border-[oklch(0.72_0.19_245_/_0.55)] bg-[oklch(0.72_0.19_245_/_0.12)]"
            : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
        }`}
      >
        <span className="relative">
          <img src={token.icon} alt={token.name} className="h-9 w-9 rounded-full" />
          {selected && (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.85_0.15_235)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.17_0.03_262)]">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-foreground">{token.symbol}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {token.name}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

function BridgeApp() {
  const [source, setSource] = useState<Chain>(CHAINS[0]);
  const [destination, setDestination] = useState<Chain>(CHAINS[3]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "transfer">("select");
  const isCompact = useMediaQuery("(max-width: 1000px)");

  const isConnected = Boolean(walletAddress);

  const connect = () => {
    setWalletAddress("0x7a2cF4d9b1eE8d3cA0f6B91C2E5a7D9b3c4e8F1a");
  };

  const disconnect = () => {
    setWalletAddress(null);
    setStep("select");
  };

  const swap = () => {
    const s = source;
    setSource(destination);
    setDestination(s);
  };

  const proceed = () => {
    if (!isConnected) {
      connect();
    }
    setStep("transfer");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="relative flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="Skyline home">
            <img src={logoAsset.url} alt="Skyline" className="h-8 w-auto md:h-9" data-skyline-logo-target />
          </Link>

          {/* TVL / TVB centered stat pill — click to open the audit page */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 min-[875px]:flex">
            <Link
              to="/audit"
              title="Open the full proof-of-reserves audit"
              aria-label="Open the full proof-of-reserves audit"
              className="pointer-events-auto group"
            >
              <StatChip label="TVL" value={isCompact ? "$12.45M" : "$12,450,238.71"} interactive />
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <Link
              to="/audit"
              title="Open the full proof-of-reserves audit"
              aria-label="Open the full proof-of-reserves audit"
              className="pointer-events-auto group"
            >
              <StatChip label="TVB" value={isCompact ? "$89.20M" : "$89,204,816.34"} interactive />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/transactions"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] hover:text-foreground md:inline-flex"
            >
              <History className="h-3.5 w-3.5" /> History
            </Link>
            <Link
              to="/audit"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] hover:text-foreground md:inline-flex"
            >
              Audit <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={isConnected ? disconnect : connect}
              className="btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              <Wallet className="h-4 w-4" />
              {isConnected ? formatAddress(walletAddress) : "Connect Wallet"}
            </button>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[875px]:hidden">
          <Link to="/audit" title="Open the full proof-of-reserves audit" aria-label="Open audit">
            <StatChip label="TVL" value="$12.45M" compact interactive />
          </Link>
          <Link to="/audit" title="Open the full proof-of-reserves audit" aria-label="Open audit">
            <StatChip label="TVB" value="$89.20M" compact interactive />
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="container-page relative py-4 md:py-5">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-gradient-sky text-balance font-display text-3xl font-semibold leading-[1.05] md:text-4xl">
              Skyline Bridge
            </h1>
          </div>

          {/* Bridge card */}
          <div
            className="mx-auto mt-4 transition-[max-width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-max-width"
            style={{ maxWidth: step === "transfer" ? "54rem" : "36rem" }}
          >
            <div key={step} className="card-glow relative animate-bridge-step-in rounded-3xl p-5 md:p-6">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              {step === "select" ? (
                <div className="grid gap-4">
                  <ChainSelect label="Source" value={source} onChange={setSource} exclude={destination.id} />

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={swap}
                      aria-label="Swap chains"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/80 text-[oklch(0.85_0.15_235)] transition-transform hover:rotate-180 hover:border-[oklch(0.72_0.19_245_/_0.5)]"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  </div>

                  <ChainSelect label="Destination" value={destination} onChange={setDestination} exclude={source.id} />

                  <button
                    type="button"
                    onClick={proceed}
                    className="btn-primary-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold"
                  >
                    {isConnected ? "Move funds" : "Connect Wallet"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <TransferForm
                  source={source}
                  destination={destination}
                  walletAddress={walletAddress ?? ""}
                  onDiscard={() => setStep("select")}
                />
              )}
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Need help? Read the{" "}
              <a href="#docs" className="text-[oklch(0.85_0.15_235)] hover:underline">
                bridge docs
              </a>{" "}
              or{" "}
              <Link to="/" className="text-[oklch(0.85_0.15_235)] hover:underline">
                return to Skyline
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-background">
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row md:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:flex-1 md:justify-start">
            <span>© {new Date().getFullYear()} Skyline. All rights reserved.</span>
            <FooterLegal />
          </div>
          <FooterSocials className="md:flex-1 md:justify-center" />
          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <span className="text-muted-foreground/70">Network:</span>
            {/* Locked once the transfer is underway — the funds are already bound to this network. */}
            {step === "transfer" ? <NetworkBadge className="inline-flex" /> : <NetworkToggle />}
          </div>
        </div>
      </footer>
    </div>
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.85_0.15_235)]">{label}</span>
      <span className={`font-display font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}

function TransferForm({
  source,
  destination,
  walletAddress,
  onDiscard,
}: {
  source: Chain;
  destination: Chain;
  walletAddress: string;
  onDiscard: () => void;
}) {
  const [destAddress, setDestAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "preparing" | "signing">("idle");
  const balance = 5.99999;
  const [selectedToken, setSelectedToken] = useState<Token>(
    () => TOKENS.find((t) => t.symbol === (source.symbol ?? "AP3X")) ?? TOKENS[0],
  );
  const token = selectedToken.symbol;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDestAddress(text.trim());
    } catch {
      /* clipboard blocked */
    }
  };

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const setMax = () => setAmount(balance.toString());

  const canMoveFunds = destAddress.trim() !== "" && amount.trim() !== "" && Number(amount) > 0;

  const navigate = useNavigate();

  const handleMoveFunds = async () => {
    if (!canMoveFunds) return;
    setStatus("preparing");

    // ─────────────────────────────────────────────────────────────
    // WALLET INTEGRATION PLACEHOLDER
    // Trigger the wallet popup here and await the user's confirmation,
    // e.g.  await wallet.requestSignature({ from: source, to: destination, amount })
    await new Promise((resolve) => setTimeout(resolve, 2200));
    // ─────────────────────────────────────────────────────────────

    setStatus("signing");

    // ─────────────────────────────────────────────────────────────
    // BRIDGE SUBMISSION PLACEHOLDER
    // Sign and broadcast the bridging transaction here,
    // e.g.  await bridge.submit({ signedTx })
    await new Promise((resolve) => setTimeout(resolve, 3500));
    // ─────────────────────────────────────────────────────────────

    const id = newTransactionId();
    navigate({
      to: "/transaction/$id",
      params: { id },
      search: {
        src: source.id,
        dst: destination.id,
        amount: amount.trim(),
        addr: destAddress.trim(),
        sender: walletAddress,
      },
    });
  };

  const isProcessing = status !== "idle";

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${
          isProcessing ? "pointer-events-none select-none opacity-40 blur-[2px]" : ""
        }`}
        aria-hidden={isProcessing}
      >
        <div className="relative grid gap-4 md:grid-cols-2 md:gap-12">
          {/* Left column: source summary */}
          <div className="grid content-start gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Source
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <img src={source.icon} alt={source.label} className="h-8 w-8 rounded-full" />
                <span className="font-medium text-foreground">{source.label}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Address
              </label>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="truncate text-sm text-foreground">{formatAddress(walletAddress)}</span>
                <button
                  type="button"
                  onClick={copyAddr}
                  aria-label="Copy address"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[oklch(0.85_0.15_235)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[oklch(0.72_0.19_245_/_0.35)] bg-[oklch(0.72_0.19_245_/_0.08)] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[oklch(0.85_0.15_235)]">
                <Wallet className="h-3.5 w-3.5" /> Available Balance
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                <span className="ml-auto text-muted-foreground">{token}</span>
              </div>
              <div className="mt-2 font-display text-2xl font-semibold text-foreground">
                <span className="text-[oklch(0.85_0.15_235)]">{Math.floor(balance)}</span>
                <span className="text-foreground/80">.{balance.toFixed(6).split(".")[1]}</span>
              </div>
            </div>
          </div>

          {/* Desktop separator between source and destination */}
          <div className="pointer-events-none absolute bottom-0 top-8 left-1/2 hidden -translate-x-1/2 md:flex md:flex-col md:items-center md:justify-center">
            <div className="h-full w-px bg-white/20" />
            {/* Arced flow arrow resting on top of the divider line */}
            <svg
              width="64"
              height="30"
              viewBox="0 0 64 30"
              fill="none"
              aria-hidden="true"
              className="absolute top-0 -translate-y-1/2 text-[oklch(0.85_0.15_235)]"
              style={{ filter: "drop-shadow(0 0 8px oklch(0.55 0.22 250 / 0.5))" }}
            >
              <path d="M10 26 Q32 2 54 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M54 26 L45 26 M54 26 L54 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Mobile separator between source and destination */}
          <div className="pointer-events-none relative flex items-center justify-center md:hidden">
            <div className="h-px w-3/4 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background/80 text-[oklch(0.85_0.15_235)] shadow-[0_0_20px_-4px_oklch(0.55_0.22_250_/_0.5)]">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>

          {/* Right column: destination form */}
          <div className="grid content-start gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Destination
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <img src={destination.icon} alt={destination.label} className="h-8 w-8 rounded-full" />
                <span className="font-medium text-foreground">{destination.label}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Destination Address
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-[oklch(0.72_0.19_245_/_0.5)]">
                <input
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="0x…"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={paste}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.85_0.15_235)] transition-colors hover:text-foreground"
                >
                  <Clipboard className="h-3 w-3" /> Paste
                </button>
              </div>
            </div>

            <TokenSelect label="Source Token" value={selectedToken} onChange={setSelectedToken} />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Enter amount to send
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-[oklch(0.72_0.19_245_/_0.5)]">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.000000"
                  inputMode="decimal"
                  className="w-full bg-transparent font-display text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={setMax}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.85_0.15_235)] transition-colors hover:text-foreground"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs">
              <FeeRow label="User Wallet Fee" hint value={`0 ${token}`} />
              <FeeRow label="Bridge Transaction Fee" hint value={`1.000010 ${token}`} />
              <FeeRow label="Estimated time" value="16-20 minutes" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[oklch(0.62_0.22_25_/_0.5)] bg-[oklch(0.62_0.22_25_/_0.08)] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[oklch(0.78_0.19_25)] transition-colors hover:bg-[oklch(0.62_0.22_25_/_0.15)]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleMoveFunds}
            disabled={!canMoveFunds}
            className="btn-primary-glow inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move Funds <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 -m-5 rounded-3xl bg-background/60 backdrop-blur-md md:-m-6" />
          <div className="relative flex animate-bridge-step-in flex-col items-center gap-6 px-6 text-center">
            <TransferSpinner />
            <div className="flex flex-col items-center gap-2">
              <p key={status} className="animate-bridge-step-in font-display text-lg font-semibold text-foreground">
                {status === "preparing"
                  ? "Preparing the transaction…"
                  : "Signing and submitting the bridging transaction…"}
              </p>
              <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.78_0.19_25)]">
                <AlertCircle className="h-3.5 w-3.5" />
                Please do not leave this page during this process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransferSpinner() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <div className="absolute inset-0 animate-pulse rounded-full bg-[oklch(0.72_0.19_245_/_0.3)] blur-xl" />
      <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-white/10 border-r-[oklch(0.72_0.19_245)] border-t-[oklch(0.85_0.15_235)] shadow-[0_0_18px_-2px_oklch(0.72_0.19_245_/_0.6)]" />
    </div>
  );
}

function FeeRow({ label, value, hint }: { label: string; value: string; hint?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {hint && <HelpCircle className="h-3 w-3 text-muted-foreground/70" />}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function formatAddress(address: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
