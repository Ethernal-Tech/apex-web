import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkToggle } from "@/components/NetworkToggle";
import { BridgeHeader } from "@/components/BridgeHeader";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Clipboard,
  Filter,
  Loader2,
  Search,
  Undo2,
  Wallet,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import {
  convertApexToWei,
  convertDfmToApex,
  toFixedAmount,
} from "@/lib/amount";
import { fetchBridgeTransactions } from "@/lib/api/bridgeTransactions";
import { settingsQueryOptions } from "@/lib/api/settings";
import type { SettingsResponse } from "@/lib/api/settings";
import { tokenInfosQueryOptions } from "@/lib/api/tokenInfos";
import {
  isStatusFinal,
  getStatusIconAndLabel,
} from "@/lib/bridging/statusUtils";
import type { StatusKind } from "@/lib/bridging/statusUtils";
import { CHAIN_META } from "@/lib/chains";
import {
  getCurrencyID,
  getRealTokenIDFromEntity,
  getTokenDisplayName,
} from "@/lib/tokens";
import { useWalletSession } from "@/lib/wallet/WalletSessionProvider";
import { cn } from "@/lib/utils";
import { historyReturnTo } from "@/lib/returnTo";
import {
  BridgeTransactionDto,
  TransactionStatusEnum,
} from "@/swagger/apexBridgeApiService";

export const Route = createFileRoute("/transactions")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "world" | "user" } => ({
    view:
      search.view === "user" || search.view === "world"
        ? search.view
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Bridging History — Skyline Bridge" },
      {
        name: "description",
        content:
          "Browse, filter, and sort every bridge transaction across the Skyline network.",
      },
    ],
  }),
  component: TransactionsPage,
});

type ChainMeta = { id: string; label: string; icon: string; symbol: string };

const CHAINS: Record<string, ChainMeta> = Object.fromEntries(
  Object.entries(CHAIN_META).map(([id, meta]) => [
    id,
    {
      id,
      label: meta.label,
      icon: meta.icon,
      symbol: meta.symbol ?? "TOKEN",
    },
  ]),
);

type Status = StatusKind;

type Tx = {
  id: string;
  origin: string;
  destination: string;
  amount: number;
  amountDisplay: string;
  currencyLabel: string;
  tokenAmount: number | null;
  tokenAmountDisplay: string | null;
  tokenLabel: string | null;
  receiver: string;
  sender: string;
  createdAt: Date;
  finishedAt: Date | null;
  status: Status;
  statusLabel: string;
  rawStatus: TransactionStatusEnum;
  isRefund: boolean;
};

function mapDtoToTx(
  dto: BridgeTransactionDto,
  settings: SettingsResponse | undefined,
): Tx {
  const amountDisplay = toFixedAmount(
    convertDfmToApex(dto.amount, dto.originChain),
    6,
  );
  const hasToken =
    dto.nativeTokenAmount != null &&
    BigInt(dto.nativeTokenAmount || "0") > BigInt(0);
  const tokenAmountDisplay = hasToken
    ? toFixedAmount(convertDfmToApex(dto.nativeTokenAmount, dto.originChain), 6)
    : null;

  const currencyID = settings
    ? getCurrencyID(settings, dto.originChain)
    : undefined;
  const currencyLabel =
    getTokenDisplayName(settings, currencyID) ||
    CHAINS[dto.originChain]?.symbol ||
    "TOKEN";

  const realTokenID = settings
    ? getRealTokenIDFromEntity(settings, dto)
    : undefined;
  const tokenLabel = hasToken
    ? getTokenDisplayName(settings, realTokenID) || null
    : null;

  const statusMeta = getStatusIconAndLabel(dto.status, !!dto.isRefund);

  return {
    id: String(dto.id),
    origin: dto.originChain,
    destination: dto.destinationChain,
    amount: Number(amountDisplay),
    amountDisplay,
    currencyLabel,
    tokenAmount: tokenAmountDisplay != null ? Number(tokenAmountDisplay) : null,
    tokenAmountDisplay,
    tokenLabel,
    receiver: dto.receiverAddresses,
    sender: dto.senderAddress,
    createdAt: dto.createdAt,
    finishedAt: dto.finishedAt ?? null,
    status: statusMeta.kind,
    statusLabel: statusMeta.label,
    rawStatus: dto.status,
    isRefund: !!dto.isRefund,
  };
}

type SortKey =
  | "createdAt"
  | "finishedAt"
  | "amount"
  | "tokenAmount"
  | "origin"
  | "destination"
  | "sender"
  | "receiver"
  | "status";
type SortDir = "asc" | "desc";

type Filters = {
  origin: string;
  destination: string;
  sender: string;
  receiver: string;
  amountFrom: string;
  amountTo: string;
  tokenFrom: string;
  tokenTo: string;
  status: Status | "";
};

const EMPTY_FILTERS: Filters = {
  origin: "",
  destination: "",
  sender: "",
  receiver: "",
  amountFrom: "",
  amountTo: "",
  tokenFrom: "",
  tokenTo: "",
  status: "",
};

const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "refunding", label: "Refunding" },
];

function TransactionsPage() {
  const isCompact = useMediaQuery("(max-width: 1000px)");
  const navigate = useNavigate();
  const { view: searchView } = Route.useSearch();
  const { data: settings } = useQuery(settingsQueryOptions);
  useQuery(tokenInfosQueryOptions);
  const {
    account,
    isFullyLoggedIn,
    isConnecting: isRestoring,
    sourceChain: sessionSourceChain,
    disconnect: disconnectSession,
  } = useWalletSession();

  const walletAddress = account?.account ?? null;
  const isConnected = isFullyLoggedIn;
  const sourceChain = isConnected ? sessionSourceChain : null;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<"world" | "user">("world");
  // Until the user clicks World/Your, connected ⇒ Your history.
  const viewTouchedRef = useRef(false);

  useEffect(() => {
    if (searchView === "user" || searchView === "world") {
      if (searchView === "user" && !isConnected) {
        viewTouchedRef.current = false;
        setView("world");
        return;
      }
      viewTouchedRef.current = true;
      setView(searchView);
      return;
    }
    if (!isConnected) {
      viewTouchedRef.current = false;
      setView("world");
      return;
    }
    if (!viewTouchedRef.current) {
      setView("user");
    }
  }, [isConnected, searchView]);

  const connect = () => {
    navigate({
      to: "/bridge-app",
      search: { returnTo: "/transactions" },
    });
  };
  const disconnect = async () => {
    await disconnectSession();
    viewTouchedRef.current = false;
    setView("world");
    void navigate({ to: "/transactions", search: {}, replace: true });
  };

  const changeView = (v: "world" | "user") => {
    if (v === "user" && !isConnected) return;
    viewTouchedRef.current = true;
    setView(v);
    setPage(1);
    if (v === "user") setFilters((f) => ({ ...f, origin: "", sender: "" }));
    void navigate({
      to: "/transactions",
      search: { view: v },
      replace: true,
    });
  };

  const listQuery = useQuery({
    queryKey: [
      "bridgeTransactions",
      view,
      walletAddress,
      sourceChain,
      page,
      pageSize,
      sortKey,
      sortDir,
      filters,
      search,
    ] as const,
    enabled: view === "world" || Boolean(walletAddress),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // User history: sender = live account, origin = restored source chain.
      // World history: omit sender unless filtered.
      const senderAddress =
        view === "user" ? walletAddress! : filters.sender.trim() || undefined;

      const originChain =
        view === "user"
          ? sourceChain || undefined
          : filters.origin || undefined;

      const convertAmount = (value: string) => {
        if (!value.trim()) return undefined;
        return convertApexToWei(value);
      };

      const orderByMap: Record<SortKey, string> = {
        createdAt: "createdAt",
        finishedAt: "finishedAt",
        amount: "amountWei",
        tokenAmount: "tokenAmountWei",
        origin: "originChain",
        destination: "destinationChain",
        sender: "senderAddress",
        receiver: "receiverAddresses",
        status: "status",
      };

      // Receiver filter / search → SQL LIKE (wildcards for partial match).
      const receiverAddress = filters.receiver.trim()
        ? filters.receiver.trim()
        : search.trim()
          ? `%${search.trim()}%`
          : undefined;

      return fetchBridgeTransactions({
        page: page - 1,
        perPage: pageSize,
        orderBy: orderByMap[sortKey],
        order: sortDir,
        senderAddress,
        originChain,
        destinationChain: filters.destination || undefined,
        receiverAddress,
        amountFrom: convertAmount(filters.amountFrom),
        amountTo: convertAmount(filters.amountTo),
        nativeTokenAmountFrom: convertAmount(filters.tokenFrom),
        nativeTokenAmountTo: convertAmount(filters.tokenTo),
        displayStatus: filters.status || undefined,
      });
    },
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      if (items.length === 0) return false;
      if (items.every((x) => isStatusFinal(x.status))) return false;
      return 5000;
    },
  });

  const paged = useMemo(
    () => (listQuery.data?.items ?? []).map((dto) => mapDtoToTx(dto, settings)),
    [listQuery.data, settings],
  );

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const applyFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const isLoading = listQuery.isLoading || listQuery.isFetching;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BridgeHeader>
        <Link
          to="/bridge-app"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Transfer <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={isConnected ? disconnect : connect}
          disabled={isRestoring}
          title={isConnected ? "Disconnect" : undefined}
          className="group btn-primary-glow inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {isRestoring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isRestoring ? (
            "Connecting…"
          ) : isConnected ? (
            <span className="relative inline-grid justify-items-center">
              <span className="col-start-1 row-start-1 group-hover:opacity-0">
                {formatAddress(walletAddress)}
              </span>
              <span className="col-start-1 row-start-1 opacity-0 group-hover:opacity-100">
                Disconnect
              </span>
            </span>
          ) : (
            "Connect Wallet"
          )}
        </button>
      </BridgeHeader>

      {/* Body */}
      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1400px] px-5 py-6 md:px-8 md:py-8">
          <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[oklch(0.85_0.15_235)]">
                Bridging history
              </p>
              <h1 className="text-gradient-sky mt-1 font-display text-3xl font-semibold leading-tight md:text-4xl">
                Every hop across the Skyline
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                Search, sort, and filter every bridge transaction — from source
                lock to destination release.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by receiver address…"
                  className="h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none md:w-72"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.16em] text-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)]"
              >
                <Filter className="h-4 w-4" /> Filter
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(0.72_0.19_245)] px-1.5 text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* History scope switch */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => changeView("world")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  view === "world"
                    ? "bg-[oklch(0.72_0.19_245)] text-[oklch(0.14_0.03_260)] shadow-[0_6px_20px_-8px_oklch(0.72_0.19_245_/_0.9)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                World history
              </button>
              <button
                type="button"
                onClick={() => changeView("user")}
                aria-disabled={!isConnected}
                title={
                  isConnected
                    ? undefined
                    : "Connect your wallet to view your own bridging history"
                }
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  view === "user"
                    ? "bg-[oklch(0.72_0.19_245)] text-[oklch(0.14_0.03_260)] shadow-[0_6px_20px_-8px_oklch(0.72_0.19_245_/_0.9)]"
                    : isConnected
                      ? "text-muted-foreground hover:text-foreground"
                      : "cursor-not-allowed text-muted-foreground/40"
                }`}
              >
                Your history
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {view === "world"
                ? "Every transfer across the Skyline network."
                : "Transfers from your connected wallet and source chain."}
            </span>
          </div>

          {/* Card containing table */}
          <div>
            <div className="card-glow relative overflow-hidden rounded-3xl">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              <div
                className={isCompact ? "overflow-x-auto" : "overflow-x-hidden"}
              >
                <table
                  className={`w-full border-collapse text-sm ${
                    isCompact ? "min-w-[580px]" : "table-fixed"
                  }`}
                >
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {isCompact ? (
                        <th className="min-w-[10rem] px-4 py-4 text-center">
                          Route
                        </th>
                      ) : (
                        <>
                          <Th
                            onClick={() => toggleSort("origin")}
                            active={sortKey === "origin"}
                            dir={sortDir}
                            className="min-w-[4.75rem] min-[1200px]:w-[10.5rem]"
                          >
                            Origin
                          </Th>
                          <Th
                            onClick={() => toggleSort("destination")}
                            active={sortKey === "destination"}
                            dir={sortDir}
                            className="w-[8rem] min-[1200px]:w-[10.5rem]"
                          >
                            Destination
                          </Th>
                        </>
                      )}
                      <Th
                        onClick={() => toggleSort("amount")}
                        active={sortKey === "amount"}
                        dir={sortDir}
                        className="w-[5.25rem]"
                      >
                        Amount
                      </Th>
                      <Th
                        onClick={() => toggleSort("tokenAmount")}
                        active={sortKey === "tokenAmount"}
                        dir={sortDir}
                        className="w-[9rem]"
                      >
                        Token amount
                      </Th>
                      {!isCompact && (
                        <Th
                          onClick={() => toggleSort("sender")}
                          active={sortKey === "sender"}
                          dir={sortDir}
                        >
                          Sender
                        </Th>
                      )}
                      {!isCompact && (
                        <Th
                          onClick={() => toggleSort("receiver")}
                          active={sortKey === "receiver"}
                          dir={sortDir}
                          className="min-w-[8.75rem]"
                        >
                          Receiver
                        </Th>
                      )}
                      <Th
                        onClick={() => toggleSort("createdAt")}
                        active={sortKey === "createdAt"}
                        dir={sortDir}
                        className="min-w-[7.25rem]"
                      >
                        Created
                      </Th>
                      <Th
                        onClick={() => toggleSort("finishedAt")}
                        active={sortKey === "finishedAt"}
                        dir={sortDir}
                        className="min-w-[8.25rem]"
                      >
                        Finished
                      </Th>
                      <Th
                        onClick={() => toggleSort("status")}
                        active={sortKey === "status"}
                        dir={sortDir}
                        className="min-w-[6.5rem] w-[6.5rem] pr-2"
                      >
                        Status
                      </Th>
                      {!isCompact && (
                        <th className="w-[6.5rem] py-4 pl-2 pr-5 text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && paged.length === 0 && (
                      <tr>
                        <td
                          colSpan={isCompact ? 6 : 10}
                          className="px-5 py-14 text-center text-sm text-muted-foreground"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading transactions…
                          </span>
                        </td>
                      </tr>
                    )}
                    {listQuery.isError && paged.length === 0 && (
                      <tr>
                        <td
                          colSpan={isCompact ? 6 : 10}
                          className="px-5 py-14 text-center text-sm text-[oklch(0.8_0.2_27)]"
                        >
                          {(listQuery.error as Error)?.message ||
                            "Failed to load transactions."}
                        </td>
                      </tr>
                    )}
                    {!listQuery.isError &&
                      paged.map((t) => (
                        <TxRow
                          key={t.id}
                          tx={t}
                          compact={isCompact}
                          returnTo={historyReturnTo(view)}
                        />
                      ))}
                    {!isLoading && !listQuery.isError && paged.length === 0 && (
                      <tr>
                        <td
                          colSpan={isCompact ? 6 : 10}
                          className="px-5 py-14 text-center text-sm text-muted-foreground"
                        >
                          {view === "user" && !isConnected
                            ? "Connect your wallet to view your bridging history."
                            : "No transactions match your filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 px-5 py-4 text-xs text-muted-foreground md:flex-row">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-8 appearance-none rounded-full border border-white/10 bg-white/[0.04] px-3 pr-7 text-xs font-semibold text-foreground [color-scheme:dark] focus:outline-none"
                    >
                      {[5, 10, 25, 50].map((n) => (
                        <option
                          key={n}
                          value={n}
                          className="bg-[#141a2c] text-foreground"
                        >
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="ml-2 inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Clear filters
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {rangeStart}–{rangeEnd}
                  </span>
                  <span>of {total}</span>
                  <div className="ml-2 flex items-center gap-1">
                    <PageBtn
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </PageBtn>
                    <PageBtn
                      onClick={() =>
                        setPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </PageBtn>
                  </div>
                </div>
              </div>
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
            <NetworkToggle />
          </div>
        </div>
      </footer>

      {filtersOpen && (
        <FilterModal
          initial={filters}
          world={view === "world"}
          onClose={() => setFiltersOpen(false)}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  className?: string;
}) {
  return (
    <th className={cn("px-5 py-4", className)}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap uppercase tracking-[0.18em] transition-colors ${
          active ? "text-[oklch(0.85_0.15_235)]" : "hover:text-foreground"
        }`}
      >
        {children}
        <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center">
          {active ? (
            dir === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-60" />
          )}
        </span>
      </button>
    </th>
  );
}

function TxRow({
  tx,
  compact,
  returnTo,
}: {
  tx: Tx;
  compact: boolean;
  returnTo: string;
}) {
  const origin = CHAINS[tx.origin];
  const dest = CHAINS[tx.destination];
  const navigate = useNavigate();

  const linkProps = {
    to: "/transaction/$id" as const,
    params: { id: tx.id },
    search: { returnTo },
  };

  const rowProps = compact
    ? {
        role: "link" as const,
        tabIndex: 0,
        onClick: () => navigate(linkProps),
        onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(linkProps);
          }
        },
      }
    : {};

  return (
    <tr
      {...rowProps}
      className={`border-t border-white/5 transition-colors hover:bg-white/[0.02] ${compact ? "cursor-pointer" : ""}`}
    >
      {compact ? (
        <td className="min-w-[10rem] px-4 py-4">
          <RouteCell
            origin={origin}
            dest={dest}
            sender={tx.sender}
            receiver={tx.receiver}
          />
        </td>
      ) : (
        <>
          <td className="min-w-[4.75rem] px-5 py-4 min-[1200px]:w-[10.5rem]">
            <ChainCell chain={origin} />
          </td>
          <td className="w-[8rem] px-5 py-4 min-[1200px]:w-[10.5rem]">
            <ChainCell chain={dest} />
          </td>
        </>
      )}
      <td className="w-[5.25rem] px-5 py-4">
        <div className="font-display text-sm font-semibold text-foreground">
          {tx.amountDisplay}
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {origin?.symbol}
        </div>
      </td>
      <td className="w-[9rem] px-5 py-4">
        {tx.tokenAmountDisplay != null ? (
          <>
            <div className="font-display text-sm text-foreground">
              {tx.tokenAmountDisplay}
            </div>
            {tx.tokenLabel && (
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {tx.tokenLabel}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      {!compact && (
        <td className="px-5 py-4">
          <AddressCell address={tx.sender} />
        </td>
      )}
      {!compact && (
        <td className="min-w-[8.75rem] px-5 py-4">
          <AddressCell address={tx.receiver} />
        </td>
      )}
      <td className="min-w-[7.25rem] px-5 py-4 text-xs text-muted-foreground">
        {formatDate(tx.createdAt)}
      </td>
      <td className="min-w-[8.25rem] px-5 py-4 text-xs text-muted-foreground">
        {tx.finishedAt ? (
          formatDate(tx.finishedAt)
        ) : (
          <span className="text-[oklch(0.85_0.15_235)]">Pending</span>
        )}
      </td>
      <td className="min-w-[6.5rem] w-[6.5rem] py-4 pl-5 pr-2">
        <StatusPill status={tx.status} label={tx.statusLabel} />
      </td>
      {!compact && (
        <td className="py-4 pl-2 pr-5 text-right">
          <Link
            {...linkProps}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.85_0.15_235)] hover:underline"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </td>
      )}
    </tr>
  );
}

function ChainCell({ chain }: { chain?: ChainMeta }) {
  if (!chain) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2.5" title={chain.label}>
      <ChainIcon chain={chain} />
      <span className="hidden whitespace-nowrap font-medium text-foreground min-[1200px]:inline">
        {chain.label}
      </span>
    </div>
  );
}

function ChainIcon({ chain }: { chain: ChainMeta }) {
  return (
    <div
      className="h-7 w-7 shrink-0 overflow-hidden rounded-full"
      title={chain.label}
    >
      <img
        src={chain.icon}
        alt={chain.label}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function RouteCell({
  origin,
  dest,
  sender,
  receiver,
}: {
  origin?: ChainMeta;
  dest?: ChainMeta;
  sender: string;
  receiver: string;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] items-center gap-x-2">
      <div className="flex justify-center">
        {origin ? (
          <ChainIcon chain={origin} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <AddressCell address={sender} />
      <div className="flex justify-center py-0.5">
        <ArrowDown className="h-3 w-3 text-muted-foreground/70" />
      </div>
      <span />
      <div className="flex justify-center">
        {dest ? (
          <ChainIcon chain={dest} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <AddressCell address={receiver} />
    </div>
  );
}

function StatusPill({ status, label }: { status: Status; label: string }) {
  const caption = label.charAt(0).toUpperCase() + label.slice(1);

  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_155_/_0.4)] bg-[oklch(0.72_0.19_155_/_0.12)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[oklch(0.85_0.18_155)]">
        <CheckCircle2 className="h-3.5 w-3.5" /> {caption}
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.62_0.24_27_/_0.5)] bg-[oklch(0.62_0.24_27_/_0.12)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[oklch(0.8_0.2_27)]">
        <XCircle className="h-3.5 w-3.5" /> {caption}
      </span>
    );
  if (status === "refunded" || status === "refunding")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.78_0.14_85_/_0.45)] bg-[oklch(0.78_0.14_85_/_0.12)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[oklch(0.88_0.12_85)]">
        <Undo2 className="h-3.5 w-3.5" /> {caption}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_245_/_0.4)] bg-[oklch(0.72_0.19_245_/_0.12)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[oklch(0.85_0.15_235)]">
      <Clock className="h-3.5 w-3.5 animate-pulse" /> {caption}
    </span>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground transition-colors hover:border-[oklch(0.72_0.19_245_/_0.5)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function FilterModal({
  initial,
  world,
  onClose,
  onApply,
  onClear,
}: {
  initial: Filters;
  world: boolean;
  onClose: () => void;
  onApply: (f: Filters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(initial);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[oklch(0.16_0.035_262)] shadow-2xl">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[oklch(0.85_0.15_235)]">
              Refine results
            </p>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Filter transactions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 px-6 py-5">
          {world && (
            <div>
              <Label>Origin chain</Label>
              <div className="relative">
                <select
                  value={draft.origin}
                  onChange={(e) => set("origin", e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
                >
                  <option value="" className="bg-[#141a2c] text-foreground">
                    Any chain
                  </option>
                  {Object.values(CHAINS).map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="bg-[#141a2c] text-foreground"
                    >
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}

          <div>
            <Label>Destination chain</Label>
            <div className="relative">
              <select
                value={draft.destination}
                onChange={(e) => set("destination", e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
              >
                <option value="" className="bg-[#141a2c] text-foreground">
                  Any chain
                </option>
                {Object.values(CHAINS).map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-[#141a2c] text-foreground"
                  >
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {world && (
            <div>
              <Label>Sender address</Label>
              <input
                value={draft.sender}
                onChange={(e) => set("sender", e.target.value)}
                placeholder="Search by address…"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <Label>Receiver address</Label>
            <input
              value={draft.receiver}
              onChange={(e) => set("receiver", e.target.value)}
              placeholder="Search by address…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
            />
          </div>

          <div>
            <Label>Status</Label>
            <div className="relative">
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Status | "")}
                className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
              >
                <option value="" className="bg-[#141a2c] text-foreground">
                  Any status
                </option>
                {STATUS_FILTERS.map((s) => (
                  <option
                    key={s.value}
                    value={s.value}
                    className="bg-[#141a2c] text-foreground"
                  >
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Amount from"
              value={draft.amountFrom}
              onChange={(v) => set("amountFrom", v)}
            />
            <NumField
              label="Amount to"
              value={draft.amountTo}
              onChange={(v) => set("amountTo", v)}
            />
            <NumField
              label="Token amount from"
              value={draft.tokenFrom}
              onChange={(v) => set("tokenFrom", v)}
            />
            <NumField
              label="Token amount to"
              value={draft.tokenTo}
              onChange={(v) => set("tokenTo", v)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
          <button
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onClear();
            }}
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground hover:border-white/25"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(draft)}
              className="btn-primary-glow inline-flex items-center rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}

function formatAddress(a: string | null) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function AddressCell({ address }: { address: string }) {
  if (!address) {
    return <span className="text-muted-foreground">—</span>;
  }

  const head = 6;
  const tail = 4;
  const collapsed = address.length > head + tail;

  return (
    <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
      {collapsed ? (
        <span className="flex min-w-0 flex-1 overflow-hidden">
          <span className="shrink-0">{address.slice(0, head)}</span>
          <span className="shrink-0">…</span>
          <span
            className="min-w-0 overflow-hidden whitespace-nowrap [unicode-bidi:isolate]"
            dir="rtl"
          >
            <span dir="ltr">{address.slice(-tail)}</span>
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          {address}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard?.writeText(address);
        }}
        className="relative shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
        aria-label="Copy address"
      >
        <Clipboard className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function formatDate(d: Date) {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
