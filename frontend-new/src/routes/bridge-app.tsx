import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useBridgeFees } from "@/hooks/use-bridge-fees";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkBadge, NetworkToggle } from "@/components/NetworkToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  convertApexToDfm,
  convertDfmToApex,
  convertDfmToDisplay,
  formatBalanceParts,
  toFixedAmount,
  toFixedFloor,
} from "@/lib/amount";
import { bridgingAddressesQueryOptions } from "@/lib/api/bridgingAddresses";
import { settingsQueryOptions } from "@/lib/api/settings";
import { tokenInfosQueryOptions } from "@/lib/api/tokenInfos";
import {
  getAdjustedBridgeTxFee,
  getDefaultBridgeTxFee,
} from "@/lib/bridging/adjustedBridgeFee";
import { submitBridgeTransfer } from "@/lib/bridging/bridgeSubmit";
import { getEstimatedBridgeTime } from "@/lib/bridging/estimatedBridgeTime";
import { resolveBridgeMaxAmounts } from "@/lib/bridging/maxAmount";
import { BridgingModeEnum, getBridgingMode } from "@/lib/bridging/mode";
import {
  CHAIN_FILTERS,
  CHAIN_META,
  chainMatchesFilter,
  getDstChains,
  getSrcChains,
  type BridgeChain,
  type ChainFilterId,
} from "@/lib/chains";
import {
  getCurrencyID,
  getSupportedSourceTokens,
  getTokenDisplayName,
  type BridgeToken,
} from "@/lib/tokens";
import type { SettingsResponse } from "@/lib/api/settings";
import appSettings from "@/settings/appSettings";
import { ChainEnum } from "@/swagger/apexBridgeApiService";
import {
  connectWallet,
  disconnectWallet,
  loadStoredDestinationChain,
  loadStoredSourceChain,
  loadStoredWalletName,
  persistDestinationChain,
  persistSourceChain,
  restoreWallet,
  type WalletSession,
} from "@/lib/wallet/connect";
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
  Sparkles,
  X,
  HelpCircle,
  Copy,
  Clipboard,
  AlertCircle,
  History,
  Loader2,
} from "lucide-react";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import { useBridgeStats } from "@/hooks/use-bridge-stats";
import { formatUsdCompact, formatUsdFull } from "@/lib/usd";

export const Route = createFileRoute("/bridge-app")({
  head: () => ({
    meta: [
      { title: "Skyline Bridge — Move assets across chains" },
      {
        name: "description",
        content:
          "The Skyline Bridge app. Move native assets across 10+ chains in seconds.",
      },
    ],
  }),
  component: BridgeApp,
});

type Chain = BridgeChain;

function ChainSelect({
  label,
  value,
  onChange,
  chains,
  disabled = false,
}: {
  label: string;
  value: Chain;
  onChange: (c: Chain) => void;
  chains: Chain[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        title={
          disabled
            ? "Disconnect wallet to change the source network"
            : undefined
        }
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-white/10"
      >
        <span className="flex items-center gap-3">
          <img
            src={value.icon}
            alt={value.label}
            className="h-8 w-8 rounded-full"
          />
          <span className="flex flex-col">
            <span className="font-medium text-foreground leading-tight">
              {value.label}
            </span>
            {value.symbol && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {value.symbol}
              </span>
            )}
          </span>
        </span>
        {!disabled && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
            Change <ChevronDown className="h-3 w-3" />
          </span>
        )}
      </button>
      <ChainPickerModal
        open={open && !disabled}
        title={`Select ${label.toLowerCase()} network`}
        chains={chains}
        selectedId={value.id}
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
  chains,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  chains: Chain[];
  selectedId: string;
  onClose: () => void;
  onSelect: (c: Chain) => void;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ChainFilterId>("all");
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
    return chains.filter((c) => {
      if (!chainMatchesFilter(c, cat)) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        (c.symbol?.toLowerCase().includes(q) ?? false) ||
        c.id.includes(q)
      );
    });
  }, [chains, query, cat]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
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
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">
              {title}
            </h2>
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
              placeholder="Search networks…"
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
            {CHAIN_FILTERS.map((c) => (
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
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {chains.length === 0
                  ? "No networks available."
                  : `No networks match${query ? ` "${query}"` : ""}.`}
              </div>
            ) : (
              <>
                <SectionHeader
                  icon={<Sparkles className="h-3 w-3" />}
                  label="Networks"
                  count={filtered.length}
                />
                <ul className="grid gap-1">
                  {filtered.map((c) => (
                    <ChainRow
                      key={c.id}
                      chain={c}
                      selected={c.id === selectedId}
                      onSelect={() => onSelect(c)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="relative flex flex-none items-center justify-between border-t border-white/5 px-6 py-3 text-[11px] text-muted-foreground">
          <span>
            {chains.length} network{chains.length === 1 ? "" : "s"} from
            settings
          </span>
          <span className="hidden items-center gap-1 md:inline-flex">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">
              Esc
            </kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
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
          <img
            src={chain.icon}
            alt={chain.label}
            className="h-9 w-9 rounded-full"
          />
          {selected && (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.85_0.15_235)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.17_0.03_262)]">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-foreground">
              {chain.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {chain.symbol} ·{" "}
              {chain.apexFusion
                ? `Apex Fusion · ${chain.category.toUpperCase()}`
                : chain.category === "utxo"
                  ? "UTXO"
                  : chain.category === "svm"
                    ? "SVM"
                    : "EVM"}
            </span>
          </span>
          {disabled ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              In use
            </span>
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

type Token = BridgeToken;

function TokenSelect({
  label,
  value,
  onChange,
  tokens,
}: {
  label: string;
  value: Token;
  onChange: (t: Token) => void;
  tokens: Token[];
}) {
  const [open, setOpen] = useState(false);
  const canChange = tokens.length > 1;
  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={!canChange}
        onClick={() => {
          if (canChange) setOpen(true);
        }}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] disabled:cursor-default disabled:hover:border-white/10"
      >
        <span className="flex items-center gap-3">
          <img
            src={value.icon}
            alt={value.name}
            className="h-8 w-8 rounded-full"
          />
          <span className="flex flex-col">
            <span className="font-medium text-foreground leading-tight">
              {value.symbol}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {value.name}
            </span>
          </span>
        </span>
        {canChange && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
            Change <ChevronDown className="h-3 w-3" />
          </span>
        )}
      </button>
      <TokenPickerModal
        open={open}
        title={`Select ${label.toLowerCase()}`}
        tokens={tokens}
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
  tokens,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  tokens: Token[];
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
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.id.includes(q),
    );
  }, [query, tokens]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
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
              Tokens
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold text-foreground">
              {title}
            </h2>
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
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {query
                  ? `No tokens match "${query}".`
                  : "No tokens available for this route."}
              </div>
            )}

            {filtered.length > 0 && (
              <SectionHeader
                icon={<Sparkles className="h-3 w-3" />}
                label="Available"
                count={filtered.length}
              />
            )}
            <ul className="grid gap-1">
              {filtered.map((t) => (
                <TokenRow
                  key={t.id}
                  token={t}
                  selected={t.id === selectedId}
                  onSelect={() => onSelect(t)}
                />
              ))}
            </ul>
          </div>
        </div>

        <div className="relative flex flex-none items-center justify-between border-t border-white/5 px-6 py-3 text-[11px] text-muted-foreground">
          <span>
            {tokens.length} token{tokens.length === 1 ? "" : "s"} for this route
          </span>
          <span className="hidden items-center gap-1 md:inline-flex">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px]">
              Esc
            </kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TokenRow({
  token,
  selected,
  onSelect,
}: {
  token: Token;
  selected: boolean;
  onSelect: () => void;
}) {
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
          <img
            src={token.icon}
            alt={token.name}
            className="h-9 w-9 rounded-full"
          />
          {selected && (
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[oklch(0.85_0.15_235)] text-[oklch(0.14_0.03_260)] ring-2 ring-[oklch(0.17_0.03_262)]">
              <Check className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="flex flex-col min-w-0">
            <span className="truncate text-sm font-medium text-foreground">
              {token.symbol}
            </span>
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
  const { data: settings, isLoading: settingsLoading } =
    useQuery(settingsQueryOptions);
  // Hydrates token label/icon registry used by getSupportedSourceTokens / getTokenInfo.
  useQuery(tokenInfosQueryOptions);

  const sourceChains = useMemo(() => getSrcChains(settings), [settings]);
  const [source, setSource] = useState<Chain | null>(null);
  const [destination, setDestination] = useState<Chain | null>(null);

  const destinationChains = useMemo(
    () => getDstChains(source?.id, settings),
    [source?.id, settings],
  );

  const [walletSession, setWalletSession] = useState<WalletSession | null>(
    null,
  );
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState<"select" | "transfer">("select");
  const isCompact = useMediaQuery("(max-width: 1000px)");
  const { tvlUsd, tvbUsd } = useBridgeStats();
  const restoreTriedRef = useRef(false);

  const walletAddress = walletSession?.account.account ?? null;

  const { data: bridgingAddresses = [] } = useQuery({
    ...bridgingAddressesQueryOptions(source?.id),
    enabled: Boolean(walletAddress && source?.id),
  });

  const connectHandlers = useMemo(
    () => ({
      onSession: setWalletSession,
      onError: (message: string) => toast.error(message),
    }),
    [],
  );

  useEffect(() => {
    if (sourceChains.length === 0) return;
    if (source && sourceChains.some((c) => c.id === source.id)) return;
    const storedSrc = loadStoredSourceChain();
    setSource(sourceChains.find((c) => c.id === storedSrc) ?? sourceChains[0]);
  }, [source, sourceChains]);

  useEffect(() => {
    if (!source || destinationChains.length === 0) return;
    if (destination && destinationChains.some((c) => c.id === destination.id)) {
      return;
    }
    const storedDst = loadStoredDestinationChain();
    setDestination(
      destinationChains.find((c) => c.id === storedDst) ?? destinationChains[0],
    );
  }, [source, destination, destinationChains]);

  useEffect(() => {
    if (source) persistSourceChain(source.id);
  }, [source]);

  useEffect(() => {
    if (destination) persistDestinationChain(destination.id);
  }, [destination]);

  // Re-enable the saved wallet after settings load.
  useEffect(() => {
    if (restoreTriedRef.current) return;
    if (!settings || !source || !destination) return;
    if (walletSession) return;

    const walletName = loadStoredWalletName();
    if (!walletName) return;

    restoreTriedRef.current = true;
    setConnecting(true);
    void restoreWallet(
      walletName,
      source.id,
      destination.id,
      settings,
      connectHandlers,
    ).finally(() => setConnecting(false));
  }, [settings, source, destination, walletSession, connectHandlers]);

  const canSwap = useMemo(() => {
    if (!source || !destination) return false;
    return getDstChains(destination.id, settings).some(
      (c) => c.id === source.id,
    );
  }, [source, destination, settings]);

  const isConnected = Boolean(walletAddress);

  const connect = useCallback(async () => {
    if (!settings || !source || !destination) {
      toast.error("Networks are still loading. Please try again.");
      return false;
    }
    setConnecting(true);
    try {
      return await connectWallet(
        source.id,
        destination.id,
        settings,
        connectHandlers,
      );
    } finally {
      setConnecting(false);
    }
  }, [settings, source, destination, connectHandlers]);

  const disconnect = useCallback(async () => {
    await disconnectWallet(connectHandlers);
    setStep("select");
  }, [connectHandlers]);

  const swap = () => {
    if (!source || !destination || !canSwap) return;
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const proceed = async () => {
    if (!isConnected) {
      const ok = await connect();
      if (!ok) return;
    }
    setStep("transfer");
  };

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

          {/* TVL / TVB centered stat pill — click to open the audit page */}
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
              disabled={connecting}
              onClick={() => {
                void (isConnected ? disconnect() : connect());
              }}
              className="btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {connecting
                ? "Connecting…"
                : isConnected
                  ? formatAddress(walletAddress)
                  : "Connect Wallet"}
            </button>
          </div>
        </div>

        {/* Mobile stats */}
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
            <div
              key={step}
              className="card-glow relative animate-bridge-step-in rounded-3xl p-5 md:p-6"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              {step === "select" ? (
                <div className="grid gap-4">
                  {settingsLoading || !source || !destination ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Loading networks…
                    </div>
                  ) : (
                    <>
                      <ChainSelect
                        label="Source"
                        value={source}
                        onChange={setSource}
                        chains={sourceChains}
                        disabled={isConnected}
                      />

                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={swap}
                          disabled={!canSwap || isConnected}
                          aria-label="Swap chains"
                          title={
                            isConnected
                              ? "Disconnect wallet to change the source network"
                              : undefined
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-background/80 text-[oklch(0.85_0.15_235)] transition-transform hover:rotate-180 hover:border-[oklch(0.72_0.19_245_/_0.5)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:rotate-0"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                      </div>

                      <ChainSelect
                        label="Destination"
                        value={destination}
                        onChange={setDestination}
                        chains={destinationChains}
                      />

                      <button
                        type="button"
                        disabled={connecting}
                        onClick={() => {
                          void proceed();
                        }}
                        className="btn-primary-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold disabled:opacity-60"
                      >
                        {connecting ? (
                          <>
                            Connecting…
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          <>
                            {isConnected ? "Move funds" : "Connect Wallet"}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              ) : source && destination ? (
                <TransferForm
                  source={source}
                  destination={destination}
                  settings={settings}
                  walletAddress={walletAddress ?? ""}
                  bridgingAddresses={bridgingAddresses}
                  onDiscard={() => setStep("select")}
                />
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Loading networks…
                </div>
              )}
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Need help? Read the{" "}
              <a
                href="#docs"
                className="text-[oklch(0.85_0.15_235)] hover:underline"
              >
                bridge docs
              </a>{" "}
              or{" "}
              <Link
                to="/"
                className="text-[oklch(0.85_0.15_235)] hover:underline"
              >
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
            <span>
              © {new Date().getFullYear()} Skyline. All rights reserved.
            </span>
            <FooterLegal />
          </div>
          <FooterSocials className="md:flex-1 md:justify-center" />
          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <span className="text-muted-foreground/70">Network:</span>
            {/* Locked once the transfer is underway — the funds are already bound to this network. */}
            {step === "transfer" ? (
              <NetworkBadge className="inline-flex" />
            ) : (
              <NetworkToggle />
            )}
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

function TransferForm({
  source,
  destination,
  settings,
  walletAddress,
  bridgingAddresses,
  onDiscard,
}: {
  source: Chain;
  destination: Chain;
  settings: SettingsResponse | undefined;
  walletAddress: string;
  bridgingAddresses: string[];
  onDiscard: () => void;
}) {
  const [destAddress, setDestAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "preparing" | "signing">(
    "idle",
  );
  const [adjustedBridgeTxFeeDfm, setAdjustedBridgeTxFeeDfm] = useState("0");

  const { data: tokenInfos } = useQuery(tokenInfosQueryOptions);

  const availableTokens = useMemo(
    () => getSupportedSourceTokens(settings, source.id, destination.id),
    // tokenInfos hydrates getTokenInfo() used inside getSupportedSourceTokens.
    [settings, source.id, destination.id, tokenInfos],
  );

  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  useEffect(() => {
    if (availableTokens.length === 0) {
      setSelectedToken(null);
      return;
    }
    setSelectedToken((prev) => {
      if (prev && availableTokens.some((t) => t.id === prev.id)) return prev;
      return availableTokens[0];
    });
  }, [availableTokens]);

  const { balances, loading: balancesLoading } = useWalletBalances({
    enabled: Boolean(walletAddress),
    srcChain: source.id,
    dstChain: destination.id,
    settings,
  });

  const currencyID = useMemo(
    () => (settings ? getCurrencyID(settings, source.id) : undefined),
    [settings, source.id],
  );
  const currencyLabel = useMemo(
    () => getTokenDisplayName(settings, currencyID),
    [settings, currencyID, tokenInfos],
  );
  const token = selectedToken?.symbol ?? "";

  const currencyBalanceDisplay = useMemo(() => {
    if (currencyID === undefined) return null;
    const raw = balances[currencyID];
    if (raw === undefined) return null;
    return toFixedAmount(convertDfmToDisplay(raw, source.id), 6);
  }, [balances, currencyID, source.id]);

  const selectedTokenBalanceDisplay = useMemo(() => {
    if (!selectedToken || currencyID === undefined) return null;
    if (selectedToken.tokenID === currencyID) return null;
    const raw = balances[selectedToken.tokenID];
    if (raw === undefined) return null;
    return toFixedAmount(convertDfmToDisplay(raw, source.id), 6);
  }, [balances, selectedToken, currencyID, source.id]);

  const currencyBalanceDfm =
    currencyID !== undefined ? (balances[currencyID] ?? "0") : "0";

  const fees = useBridgeFees({
    enabled: Boolean(walletAddress && settings && selectedToken),
    settings,
    srcChain: source.id,
    dstChain: destination.id,
    senderAddress: walletAddress,
    destinationAddress: destAddress,
    amountDisplay: amount,
    tokenID: selectedToken?.tokenID,
    currencyID,
    currencyBalanceDfm,
  });

  const bridgingModeInfo = useMemo(() => {
    if (!settings || !selectedToken) {
      return { bridgingMode: BridgingModeEnum.Unknown as BridgingModeEnum };
    }
    return getBridgingMode(
      settings,
      source.id as ChainEnum,
      destination.id as ChainEnum,
      selectedToken.tokenID,
    );
  }, [settings, selectedToken, source.id, destination.id]);

  const bridgingSettings =
    bridgingModeInfo.settings?.bridgingSettings || undefined;

  const changeMinUtxo = useMemo(() => {
    const fromMode = bridgingSettings?.minUtxoChainValue?.[source.id];
    const fromApp = appSettings.minUtxoChainValue[source.id];
    return fromMode ?? fromApp ?? 0;
  }, [bridgingSettings, source.id]);

  const defaultBridgeTxFeeDfm = useMemo(
    () =>
      getDefaultBridgeTxFee({
        chain: source.id,
        sourceTokenID: selectedToken?.tokenID,
        currencyID,
        minChainFeeForBridging: bridgingSettings?.minChainFeeForBridging,
        minChainFeeForBridgingTokens:
          bridgingSettings?.minChainFeeForBridgingTokens,
      }),
    [
      source.id,
      selectedToken?.tokenID,
      currencyID,
      bridgingSettings?.minChainFeeForBridging,
      bridgingSettings?.minChainFeeForBridgingTokens,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const bridgeTxFeeDfm = fees.bridgeTxFeeDfm || defaultBridgeTxFeeDfm;
    setAdjustedBridgeTxFeeDfm(bridgeTxFeeDfm);

    void getAdjustedBridgeTxFee({
      settings,
      bridgingAddresses,
      chain: source.id,
      sourceTokenID: selectedToken?.tokenID,
      currencyID,
      amountDisplay: amount,
      bridgeTxFeeDfm,
      defaultBridgeTxFeeDfm,
      minUtxoValue: changeMinUtxo,
    }).then((fee) => {
      if (!cancelled) setAdjustedBridgeTxFeeDfm(fee);
    });

    return () => {
      cancelled = true;
    };
  }, [
    settings,
    bridgingAddresses,
    source.id,
    selectedToken?.tokenID,
    currencyID,
    amount,
    fees.bridgeTxFeeDfm,
    defaultBridgeTxFeeDfm,
    changeMinUtxo,
  ]);

  const { maxAmounts, currencyMaxAmount, maxSendable } = useMemo(
    () =>
      resolveBridgeMaxAmounts({
        bridgingMode:
          fees.bridgingMode !== BridgingModeEnum.Unknown
            ? fees.bridgingMode
            : bridgingModeInfo.bridgingMode,
        totalBalance: balances,
        sourceTokenID: selectedToken?.tokenID,
        currencyID,
        chain: source.id,
        maxAmountAllowedToBridge:
          bridgingSettings?.maxAmountAllowedToBridge || "0",
        maxTokenAmountAllowedToBridge:
          bridgingSettings?.maxTokenAmountAllowedToBridge || "0",
        changeMinUtxo,
        userWalletFeeDfm: fees.userWalletFeeDfm || "0",
        bridgeTxFeeDfm: adjustedBridgeTxFeeDfm || "0",
        operationFeeDfm: fees.operationFeeDfm || "0",
      }),
    [
      fees.bridgingMode,
      fees.userWalletFeeDfm,
      fees.operationFeeDfm,
      adjustedBridgeTxFeeDfm,
      bridgingModeInfo.bridgingMode,
      balances,
      selectedToken?.tokenID,
      currencyID,
      source.id,
      bridgingSettings?.maxAmountAllowedToBridge,
      bridgingSettings?.maxTokenAmountAllowedToBridge,
      changeMinUtxo,
    ],
  );

  const enteredDfm = useMemo(() => {
    if (!amount.trim()) return BigInt(0);
    try {
      return BigInt(convertApexToDfm(amount || "0", source.id));
    } catch {
      return BigInt(0);
    }
  }, [amount, source.id]);

  const insufficientBalance = enteredDfm > maxAmounts.maxByBalance;
  const overMaxAllowed =
    enteredDfm > maxAmounts.maxByAllowed && maxAmounts.maxByAllowed > BigInt(0);
  const insufficientCurrency = currencyMaxAmount < BigInt(0);

  const feeTokenLabel = currencyLabel || token || "TOKEN";

  const amountError = insufficientBalance
    ? "Insufficient funds"
    : overMaxAllowed
      ? "Over maximum allowed"
      : insufficientCurrency
        ? `Insufficient ${feeTokenLabel}`
        : null;

  const formatFeeDfm = (dfm: string | undefined) => {
    if (dfm === undefined) return `— ${feeTokenLabel}`;
    if (BigInt(dfm || "0") <= BigInt(0)) return `0 ${feeTokenLabel}`;
    return `${toFixedAmount(convertDfmToApex(dfm, source.id), 6)} ${feeTokenLabel}`;
  };

  const walletFeeLabel =
    fees.bridgingMode === BridgingModeEnum.LayerZero
      ? "Estimated Network Fee"
      : "User Wallet Fee";

  const estimatedTime = getEstimatedBridgeTime(
    fees.bridgingMode,
    source.id as ChainEnum,
    destination.id as ChainEnum,
  );

  const showOperationFee =
    fees.bridgingMode === BridgingModeEnum.Skyline &&
    BigInt(fees.operationFeeDfm || "0") > BigInt(0);

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

  const setMax = () => {
    if (maxSendable <= BigInt(0)) return;
    setAmount(
      toFixedFloor(convertDfmToApex(maxSendable.toString(10), source.id), 6),
    );
  };

  const canMoveFunds =
    Boolean(selectedToken) &&
    destAddress.trim() !== "" &&
    amount.trim() !== "" &&
    enteredDfm > BigInt(0) &&
    !insufficientBalance &&
    !overMaxAllowed &&
    !insufficientCurrency;

  const navigate = useNavigate();

  const handleMoveFunds = async () => {
    if (!canMoveFunds || !settings || !selectedToken) return;
    setStatus("preparing");

    try {
      const response = await submitBridgeTransfer({
        settings,
        srcChain: source.id,
        dstChain: destination.id,
        senderAddress: walletAddress,
        destinationAddress: destAddress.trim(),
        amountDisplay: amount.trim(),
        tokenID: selectedToken.tokenID,
        updateLoadingState: (s) => {
          if (s.content?.toLowerCase().includes("sign")) {
            setStatus("signing");
          } else if (s.content) {
            setStatus("preparing");
          }
        },
      });

      if (!response) {
        setStatus("idle");
        return;
      }

      navigate({
        to: "/transaction/$id",
        params: { id: String(response.id) },
        search: {
          src: source.id,
          dst: destination.id,
          amount: amount.trim(),
          addr: destAddress.trim(),
          sender: walletAddress,
        },
      });
    } catch {
      setStatus("idle");
    }
  };

  const isProcessing = status !== "idle";

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${
          isProcessing
            ? "pointer-events-none select-none opacity-40 blur-[2px]"
            : ""
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
                <img
                  src={source.icon}
                  alt={source.label}
                  className="h-8 w-8 rounded-full"
                />
                <span className="font-medium text-foreground">
                  {source.label}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Address
              </label>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="truncate text-sm text-foreground">
                  {formatAddress(walletAddress)}
                </span>
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
                <span
                  title="Balances are read from your connected wallet on the source chain."
                  className="inline-flex"
                >
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </span>
                {balancesLoading && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {currencyBalanceDisplay ? (
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <div className="font-display text-2xl font-semibold text-foreground">
                    {(() => {
                      const parts = formatBalanceParts(currencyBalanceDisplay);
                      return (
                        <>
                          <span className="text-[oklch(0.85_0.15_235)]">
                            {parts.whole}
                          </span>
                          {parts.fraction !== null && (
                            <span className="text-foreground/80">
                              .{parts.fraction}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {currencyLabel}
                  </span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  {balancesLoading ? "Loading…" : "—"}
                </div>
              )}

              {selectedTokenBalanceDisplay && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <div className="font-display text-xl font-semibold text-foreground">
                    {(() => {
                      const parts = formatBalanceParts(
                        selectedTokenBalanceDisplay,
                      );
                      return (
                        <>
                          <span className="text-[oklch(0.85_0.15_235)]">
                            {parts.whole}
                          </span>
                          {parts.fraction !== null && (
                            <span className="text-foreground/80">
                              .{parts.fraction}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {token}
                  </span>
                </div>
              )}
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
              style={{
                filter: "drop-shadow(0 0 8px oklch(0.55 0.22 250 / 0.5))",
              }}
            >
              <path
                d="M10 26 Q32 2 54 26"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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
                <img
                  src={destination.icon}
                  alt={destination.label}
                  className="h-8 w-8 rounded-full"
                />
                <span className="font-medium text-foreground">
                  {destination.label}
                </span>
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

            {selectedToken ? (
              <TokenSelect
                label="Source Token"
                value={selectedToken}
                onChange={setSelectedToken}
                tokens={availableTokens}
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                No tokens available for {source.label} → {destination.label}.
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Enter amount to send
              </label>
              <div
                className={`flex items-center gap-3 rounded-2xl border bg-white/[0.03] px-4 py-3 focus-within:border-[oklch(0.72_0.19_245_/_0.5)] ${
                  amountError
                    ? "border-[oklch(0.62_0.22_25_/_0.55)]"
                    : "border-white/10"
                }`}
              >
                <input
                  value={amount}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^0-9.]/g, "");
                    const [, right] = next.split(".");
                    if (right && right.length > 6) return;
                    setAmount(next);
                  }}
                  placeholder="0.000000"
                  inputMode="decimal"
                  disabled={isProcessing}
                  className="w-full bg-transparent font-display text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-60"
                />
                {maxSendable > BigInt(0) && (
                  <button
                    type="button"
                    onClick={setMax}
                    disabled={isProcessing}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.85_0.15_235)] transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    Max
                  </button>
                )}
              </div>
              {amountError && (
                <p className="mt-1.5 text-xs text-[oklch(0.78_0.19_25)]">
                  {amountError}
                </p>
              )}
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs">
                <FeeRow
                  label={walletFeeLabel}
                  hint={`This is the fee paid to process your transaction on the ${source.label} blockchain. Larger transactions have higher fees.`}
                  value={formatFeeDfm(fees.userWalletFeeDfm)}
                  loading={fees.loading}
                />
                <FeeRow
                  label="Bridge Transaction Fee"
                  hint={
                    fees.bridgingMode === BridgingModeEnum.LayerZero
                      ? "This fee covers the bridge blockchain transaction costs."
                      : `This fee covers the bridge blockchain transaction costs. This fee is set to the predefined minimum. When bridging native tokens, the minimum ${feeTokenLabel} required to hold those tokens on ${source.label} is added.`
                  }
                  value={formatFeeDfm(adjustedBridgeTxFeeDfm)}
                  loading={fees.loading}
                />
                {showOperationFee && (
                  <FeeRow
                    label="Bridge Operation Fee"
                    hint="This fee covers the cost of operating the bridge, including maintaining balance between ADA and APEX during bridging."
                    value={formatFeeDfm(fees.operationFeeDfm)}
                    loading={fees.loading}
                  />
                )}
                <FeeRow label="Estimated time" value={estimatedTime} />
              </div>
            </TooltipProvider>
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
            disabled={!canMoveFunds || isProcessing}
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
              <p
                key={status}
                className="animate-bridge-step-in font-display text-lg font-semibold text-foreground"
              >
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

function FeeRow({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${label} info`}
                className="inline-flex text-muted-foreground/70 transition-colors hover:text-muted-foreground"
              >
                <HelpCircle className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="start"
              className="max-w-xs border border-white/10 bg-[oklch(0.16_0.03_262_/_0.85)] px-2.5 py-1.5 text-[11px] font-normal leading-relaxed text-foreground/80 shadow-none backdrop-blur-sm"
            >
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <span
        className={`font-semibold text-foreground ${loading ? "animate-pulse opacity-70" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function formatAddress(address: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
