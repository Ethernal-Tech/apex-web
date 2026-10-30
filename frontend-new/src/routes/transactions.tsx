import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  useChainList,
  useChainMeta,
  type ChainMetaOf,
} from "@/hooks/use-chain-infos";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { AssetIcon } from "@/components/ui/asset-icon";
import { NetworkToggle } from "@/components/NetworkToggle";
import { BridgeHeader } from "@/components/BridgeHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowDown,
  ArrowRight,
  Check,
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
  formatAmountDigits,
  formatAmountFull,
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
import {
  getCurrencyID,
  getRealTokenIDFromEntity,
  getTokenDisplayName,
} from "@/lib/tokens";
import { useWalletSession } from "@/lib/wallet/WalletSessionProvider";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";
import {
  compactTransactionFilters,
  leaveHistoryForWallet,
  TRANSACTIONS_PAGE_SIZES,
  useTransactionsListState,
  type TransactionsFilters,
  type TransactionsSortDir,
  type TransactionsSortKey,
  type TransactionsView,
} from "@/lib/transactionsListState";
import {
  BridgeTransactionDto,
  TransactionStatusEnum,
} from "@/swagger/apexBridgeApiService";

export const Route = createFileRoute("/transactions")({
  head: () =>
    pageHead({
      title: "Bridging History - Skyline Bridge",
      description:
        "Browse, filter, and sort every bridge transaction across the Skyline network.",
      path: "/transactions",
      index: false,
    }),
  component: TransactionsPage,
});

/** A chain as this page draws it, resolved from `GET /chainInfo`. */
type ChainView = { id: string; label: string; icon: string; symbol: string };

const toChainView = (chainMetaOf: ChainMetaOf, id: string): ChainView => {
  const meta = chainMetaOf(id);
  return {
    id,
    label: meta.label,
    icon: meta.icon,
    symbol: meta.symbol ?? "TOKEN",
  };
};

type Status = StatusKind;
type SortKey = TransactionsSortKey;
type SortDir = TransactionsSortDir;
type Filters = TransactionsFilters;

type Tx = {
  id: string;
  origin: string;
  destination: string;
  amount: number;
  amountDisplay: string;
  /** Unshortened, for the tooltip of the cell the shortened one is shown in. */
  amountFull: string;
  currencyLabel: string;
  tokenAmount: number | null;
  tokenAmountDisplay: string | null;
  tokenAmountFull: string | null;
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
  chainMetaOf: ChainMetaOf,
): Tx {
  const amountFull = toFixedAmount(
    convertDfmToApex(dto.amount, dto.originChain),
    6,
  );
  // the columns are a fixed width, a full six decimals runs one into the next
  const amountDisplay = formatAmountDigits(amountFull);
  const hasToken =
    dto.nativeTokenAmount != null &&
    BigInt(dto.nativeTokenAmount || "0") > BigInt(0);
  const tokenAmountFull = hasToken
    ? toFixedAmount(convertDfmToApex(dto.nativeTokenAmount, dto.originChain), 6)
    : null;
  const tokenAmountDisplay =
    tokenAmountFull != null ? formatAmountDigits(tokenAmountFull) : null;

  const currencyID = settings
    ? getCurrencyID(settings, dto.originChain)
    : undefined;
  const currencyLabel =
    getTokenDisplayName(settings, currencyID) ||
    chainMetaOf(dto.originChain).symbol ||
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
    amount: Number(amountFull),
    amountDisplay,
    amountFull,
    currencyLabel,
    tokenAmount: tokenAmountFull != null ? Number(tokenAmountFull) : null,
    tokenAmountDisplay,
    tokenAmountFull,
    tokenLabel,
    receiver: dto.receiverAddresses,
    sender: dto.senderAddress,
    createdAt: toDate(dto.createdAt) ?? new Date(0),
    finishedAt: toDate(dto.finishedAt),
    status: statusMeta.kind,
    statusLabel: statusMeta.label,
    rawStatus: dto.status,
    isRefund: !!dto.isRefund,
  };
}

const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "refunding", label: "Refunding" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "createdAt", label: "Date created" },
  { value: "finishedAt", label: "Date finished" },
  { value: "amount", label: "Amount" },
  { value: "tokenAmount", label: "Token amount" },
  { value: "origin", label: "Origin" },
  { value: "destination", label: "Destination" },
  { value: "sender", label: "Sender" },
  { value: "receiver", label: "Receiver" },
  { value: "status", label: "Status" },
];

function TransactionsPage() {
  // the table collapses one step at a time as it narrows: origin/destination
  // merge into a route, then amount/token amount and sender/receiver pairs
  // stack, then created/finished, and at last status shrinks to a row icon
  const layout: TableLayout = {
    routed: useMediaQuery("(max-width: 1399px)"),
    amountsStacked: useMediaQuery("(max-width: 1279px)"),
    datesStacked: useMediaQuery("(max-width: 959px)"),
    compact: useMediaQuery("(max-width: 887px)"),
  };
  const columnCount = layout.compact
    ? 4
    : (layout.routed ? 1 : 2) +
      (layout.amountsStacked ? 2 : 4) +
      (layout.datesStacked ? 1 : 2) +
      2;
  const navigate = useNavigate();
  const [list, setList] = useTransactionsListState();
  const { data: settings } = useQuery(settingsQueryOptions);
  useQuery(tokenInfosQueryOptions);
  const chainMetaOf = useChainMeta();
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

  const view: TransactionsView =
    list.view === "user" && !isConnected ? "world" : (list.view ?? "world");
  const addrSearch = list.addrSearch;
  const sortKey = list.sortKey;
  const sortDir = list.sortDir;
  const page = list.page;
  const pageSize = list.pageSize;
  const filters = list.filters;
  const [filtersOpen, setFiltersOpen] = useState(false);

  const connect = () => {
    leaveHistoryForWallet("/transactions");
    void navigate({ to: "/bridge-app" });
  };
  const disconnect = async () => {
    await disconnectSession();
    setList({ view: "world" });
  };

  const changeView = (v: TransactionsView) => {
    if (v === "user" && !isConnected) return;
    if (v === "user") {
      const rest = { ...filters };
      delete rest.origin;
      delete rest.sender;
      setList({ view: v, page: 1, filters: rest });
      return;
    }
    setList({ view: v, page: 1 });
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
      addrSearch,
    ] as const,
    enabled: view === "world" || Boolean(walletAddress),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // User history: sender = live account, origin = restored source chain.
      // World history: omit sender unless filtered.
      const senderAddress =
        view === "user" ? walletAddress! : filters.sender?.trim() || undefined;

      const originChain =
        view === "user"
          ? sourceChain || undefined
          : filters.origin || undefined;

      const convertAmount = (value?: string) => {
        if (!value?.trim()) return undefined;
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
      const receiverAddress = filters.receiver?.trim()
        ? filters.receiver.trim()
        : addrSearch.trim()
          ? `%${addrSearch.trim()}%`
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

  const paged = useMemo(() => {
    const rows = (listQuery.data?.items ?? []).map((dto) =>
      mapDtoToTx(dto, settings, chainMetaOf),
    );
    if (sortKey !== "finishedAt") return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const at = a.finishedAt?.getTime();
      const bt = b.finishedAt?.getTime();
      if (at == null && bt == null) return 0;
      if (at == null) return 1;
      if (bt == null) return -1;
      return (at - bt) * dir;
    });
  }, [listQuery.data, settings, chainMetaOf, sortKey, sortDir]);

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  const toggleSort = (key: TransactionsSortKey) => {
    if (sortKey === key) {
      setList({
        sortDir: sortDir === "asc" ? "desc" : "asc",
        page: 1,
      });
      return;
    }
    setList({ sortKey: key, sortDir: "desc", page: 1 });
  };

  const applyFilters = (next: TransactionsFilters) => {
    setList({ filters: compactTransactionFilters(next), page: 1 });
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setList({ filters: {}, page: 1 });
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
          id={isConnected ? "basic-button" : undefined}
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
                Search, sort, and filter every bridge transaction - from source
                lock to destination release.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={addrSearch}
                  onChange={(e) => {
                    setList({ addrSearch: e.target.value, page: 1 });
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
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
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
            {/* merged table headers can not sort, so sorting moves here */}
            {layout.routed && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <SortSelect
                  ariaLabel="Sort by"
                  value={sortKey}
                  options={SORT_OPTIONS}
                  onChange={(key) => setList({ sortKey: key, page: 1 })}
                />
                <SortSelect
                  ariaLabel="Sort direction"
                  value={sortDir}
                  options={[
                    { value: "desc", label: "Descending" },
                    { value: "asc", label: "Ascending" },
                  ]}
                  onChange={(dir) => setList({ sortDir: dir, page: 1 })}
                />
              </div>
            )}
          </div>

          {/* Card containing table */}
          <div>
            <div className="card-glow relative overflow-hidden rounded-3xl">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              <div
                className={
                  layout.compact
                    ? "overflow-x-auto scrollbar-sky"
                    : "overflow-x-hidden"
                }
              >
                <TooltipProvider delayDuration={200}>
                  <table
                    className={`w-full border-collapse text-sm ${
                      layout.compact ? "min-w-[580px]" : "table-fixed"
                    }`}
                  >
                    <thead>
                      <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {layout.compact ? (
                          <>
                            {/* status icons, they need no caption */}
                            <th
                              aria-label="Status"
                              className="w-px py-4 pl-4 pr-0"
                            />
                            <th className="w-[11rem] min-w-[10rem] px-4 py-4 text-center">
                              Route
                            </th>
                          </>
                        ) : layout.routed ? (
                          <th className="w-[7.5rem] px-5 py-4">Route</th>
                        ) : (
                          <>
                            <Th
                              onClick={() => toggleSort("origin")}
                              active={sortKey === "origin"}
                              dir={sortDir}
                              className="w-[10rem]"
                            >
                              Origin
                            </Th>
                            <Th
                              onClick={() => toggleSort("destination")}
                              active={sortKey === "destination"}
                              dir={sortDir}
                              className="w-[10rem]"
                            >
                              Destination
                            </Th>
                          </>
                        )}
                        {layout.amountsStacked ? (
                          <StackedTh
                            labels={["Amount", "Token amount"]}
                            className="w-[10rem]"
                          />
                        ) : (
                          <>
                            <Th
                              onClick={() => toggleSort("amount")}
                              active={sortKey === "amount"}
                              dir={sortDir}
                              className="w-[8rem]"
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
                          </>
                        )}
                        {!layout.compact &&
                          (layout.amountsStacked ? (
                            <StackedTh
                              labels={["Sender", "Receiver"]}
                              className="min-w-[8.75rem]"
                            />
                          ) : (
                            <>
                              <Th
                                onClick={() => toggleSort("sender")}
                                active={sortKey === "sender"}
                                dir={sortDir}
                              >
                                Sender
                              </Th>
                              <Th
                                onClick={() => toggleSort("receiver")}
                                active={sortKey === "receiver"}
                                dir={sortDir}
                                className="min-w-[8.75rem]"
                              >
                                Receiver
                              </Th>
                            </>
                          ))}
                        {layout.datesStacked ? (
                          <StackedTh
                            labels={["Created", "Finished"]}
                            className="w-[11rem]"
                          />
                        ) : (
                          <>
                            <Th
                              onClick={() => toggleSort("createdAt")}
                              active={sortKey === "createdAt"}
                              dir={sortDir}
                              className="w-[7.75rem]"
                            >
                              Created
                            </Th>
                            <Th
                              onClick={() => toggleSort("finishedAt")}
                              active={sortKey === "finishedAt"}
                              dir={sortDir}
                              className="w-[7.75rem]"
                            >
                              Finished
                            </Th>
                          </>
                        )}
                        {!layout.compact && (
                          <>
                            <Th
                              onClick={() => toggleSort("status")}
                              active={sortKey === "status"}
                              dir={sortDir}
                              className="min-w-[6.5rem] w-[6.5rem] pr-2"
                            >
                              Status
                            </Th>
                            <th className="w-[6.5rem] py-4 pl-2 pr-5 text-right">
                              Actions
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading && paged.length === 0 && (
                        <>
                          {Array.from({ length: 6 }, (_, row) => (
                            <tr
                              key={`sk-${row}`}
                              className="border-t border-white/5"
                            >
                              {Array.from(
                                { length: columnCount },
                                (__, col) => (
                                  <td
                                    key={col}
                                    className={`py-4 ${
                                      col === 0
                                        ? "pl-4 pr-2"
                                        : col === columnCount - 1
                                          ? "pl-2 pr-5"
                                          : "px-2"
                                    }`}
                                  >
                                    <Skeleton
                                      className={`h-3.5 ${
                                        col % 3 === 0
                                          ? "w-24"
                                          : col % 3 === 1
                                            ? "w-16"
                                            : "w-20"
                                      }`}
                                    />
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </>
                      )}
                      {listQuery.isError && paged.length === 0 && (
                        <tr>
                          <td
                            colSpan={columnCount}
                            className="px-5 py-14 text-center text-sm text-[oklch(0.8_0.2_27)]"
                          >
                            {(listQuery.error as Error)?.message ||
                              "Failed to load transactions."}
                          </td>
                        </tr>
                      )}
                      {!listQuery.isError &&
                        paged.map((t) => (
                          <TxRow key={t.id} tx={t} layout={layout} />
                        ))}
                      {!isLoading &&
                        !listQuery.isError &&
                        paged.length === 0 && (
                          <tr>
                            <td
                              colSpan={columnCount}
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
                </TooltipProvider>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 px-5 py-4 text-xs text-muted-foreground md:flex-row">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setList({
                          pageSize: Number(e.target.value),
                          page: 1,
                        });
                      }}
                      className="h-8 appearance-none rounded-full border border-white/10 bg-white/[0.04] px-3 pr-7 text-xs font-semibold text-foreground [color-scheme:dark] focus:outline-none"
                    >
                      {[...TRANSACTIONS_PAGE_SIZES].map((n) => (
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
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {rangeStart}–{rangeEnd}
                  </span>
                  <span>of {total}</span>
                  <div className="ml-2 flex items-center gap-1">
                    <PageBtn
                      onClick={() =>
                        setList({ page: Math.max(1, currentPage - 1) })
                      }
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </PageBtn>
                    <PageBtn
                      onClick={() =>
                        setList({
                          page: Math.min(totalPages, currentPage + 1),
                        })
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

function SortSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 appearance-none rounded-full border border-white/10 bg-white/[0.04] px-3 pr-7 text-xs font-semibold text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-[#141a2c] text-foreground"
          >
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/** Header of a column two fields are stacked in, without sorting - there is no room for it. */
function StackedTh({
  labels,
  className = "",
}: {
  labels: [string, string];
  className?: string;
}) {
  return (
    <th className={cn("px-5 py-4", className)}>
      {/* when it does not fit, it wraps only after the slash */}
      <span className="whitespace-nowrap">{labels[0]} /</span>{" "}
      <span className="whitespace-nowrap">{labels[1]}</span>
    </th>
  );
}

/** Shortened amount, the full one is shown on hover in the same font. */
function AmountWithTooltip({
  display,
  full,
  className,
}: {
  display: string;
  full: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("font-display text-sm text-foreground", className)}>
          {display}
        </div>
      </TooltipTrigger>
      <TooltipContent
        className={cn(
          "border border-white/10 bg-[oklch(0.16_0.03_262_/_0.85)] font-display text-sm text-foreground shadow-none backdrop-blur-sm",
          className,
        )}
      >
        {formatAmountFull(full)}
      </TooltipContent>
    </Tooltip>
  );
}

/** Amount with its currency/token label next to it, for the stacked amounts column. */
function StackedAmount({
  display,
  full,
  label,
  className,
}: {
  display: string;
  full: string;
  label?: string | null;
  className?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <AmountWithTooltip className={className} display={display} full={full} />
      {label && (
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

/** Collapse steps of the table, each narrower step keeps the previous ones. */
type TableLayout = {
  routed: boolean;
  amountsStacked: boolean;
  datesStacked: boolean;
  compact: boolean;
};

function TxRow({ tx, layout }: { tx: Tx; layout: TableLayout }) {
  const { compact } = layout;
  const chainMetaOf = useChainMeta();
  const origin = toChainView(chainMetaOf, tx.origin);
  const dest = toChainView(chainMetaOf, tx.destination);
  const navigate = useNavigate();

  const linkProps = {
    to: "/transaction/$id" as const,
    params: { id: tx.id },
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
      {compact && (
        <td className="w-px py-4 pl-4 pr-0">
          <StatusPill status={tx.status} label={tx.statusLabel} iconOnly />
        </td>
      )}
      {compact ? (
        <td className="w-[11rem] min-w-[10rem] px-4 py-4">
          <RouteCell
            origin={origin}
            dest={dest}
            sender={tx.sender}
            receiver={tx.receiver}
          />
        </td>
      ) : layout.routed ? (
        <td className="w-[7.5rem] px-5 py-4">
          <div className="flex items-center gap-1.5">
            <ChainCell chain={origin} />
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <ChainCell chain={dest} />
          </div>
        </td>
      ) : (
        <>
          <td className="w-[10rem] px-5 py-4">
            <ChainCell chain={origin} />
          </td>
          <td className="w-[10rem] px-5 py-4">
            <ChainCell chain={dest} />
          </td>
        </>
      )}
      {layout.amountsStacked ? (
        <td className="w-[10rem] px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <StackedAmount
              className="font-semibold"
              display={tx.amountDisplay}
              full={tx.amountFull}
              label={origin?.symbol}
            />
            {tx.tokenAmountDisplay != null && (
              <StackedAmount
                display={tx.tokenAmountDisplay}
                full={tx.tokenAmountFull ?? tx.tokenAmountDisplay}
                label={tx.tokenLabel}
              />
            )}
          </div>
        </td>
      ) : (
        <>
          <td className="w-[8rem] px-5 py-4">
            <AmountWithTooltip
              className="font-semibold"
              display={tx.amountDisplay}
              full={tx.amountFull}
            />
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {origin?.symbol}
            </div>
          </td>
          <td className="w-[9rem] px-5 py-4">
            {tx.tokenAmountDisplay != null ? (
              <>
                <AmountWithTooltip
                  display={tx.tokenAmountDisplay}
                  full={tx.tokenAmountFull ?? tx.tokenAmountDisplay}
                />
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
        </>
      )}
      {!compact &&
        (layout.amountsStacked ? (
          <td className="min-w-[8.75rem] px-5 py-4">
            <div className="flex w-fit min-w-0 max-w-full flex-col gap-0.5">
              <AddressCell address={tx.sender} />
              <ArrowDown className="h-3 w-3 text-muted-foreground/70" />
              <AddressCell address={tx.receiver} />
            </div>
          </td>
        ) : (
          <>
            <td className="px-5 py-4">
              <AddressCell address={tx.sender} />
            </td>
            <td className="min-w-[8.75rem] px-5 py-4">
              <AddressCell address={tx.receiver} />
            </td>
          </>
        ))}
      {layout.datesStacked ? (
        <td className="w-[11rem] px-5 py-4 text-xs text-muted-foreground">
          <div className="flex flex-col gap-0.5">
            <DateTime date={tx.createdAt} inline />
            <ArrowDown className="h-3 w-3 text-muted-foreground/70" />
            {tx.finishedAt ? (
              <DateTime date={tx.finishedAt} inline />
            ) : (
              <span className="text-[oklch(0.85_0.15_235)]">Pending</span>
            )}
          </div>
        </td>
      ) : (
        <>
          <td className="w-[7.75rem] px-5 py-4 text-xs text-muted-foreground">
            <DateTime date={tx.createdAt} />
          </td>
          <td className="w-[7.75rem] px-5 py-4 text-xs text-muted-foreground">
            {tx.finishedAt ? (
              <DateTime date={tx.finishedAt} />
            ) : (
              <span className="text-[oklch(0.85_0.15_235)]">Pending</span>
            )}
          </td>
        </>
      )}
      {!compact && (
        <td className="min-w-[6.5rem] w-[6.5rem] py-4 pl-5 pr-2">
          <StatusPill status={tx.status} label={tx.statusLabel} />
        </td>
      )}
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

function ChainCell({ chain }: { chain?: ChainView }) {
  if (!chain) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2.5" title={chain.label}>
      <ChainIcon chain={chain} />
      <span className="hidden whitespace-nowrap font-medium text-foreground min-[1400px]:inline">
        {chain.label}
      </span>
    </div>
  );
}

function ChainIcon({ chain }: { chain: ChainView }) {
  return (
    <div
      className="h-7 w-7 shrink-0 overflow-hidden rounded-full"
      title={chain.label}
    >
      <AssetIcon
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
  origin?: ChainView;
  dest?: ChainView;
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

const STATUS_STYLES: Record<
  Status,
  { className: string; icon: React.ReactNode }
> = {
  success: {
    className:
      "border-[oklch(0.72_0.19_155_/_0.4)] bg-[oklch(0.72_0.19_155_/_0.12)] text-[oklch(0.85_0.18_155)]",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    className:
      "border-[oklch(0.62_0.24_27_/_0.5)] bg-[oklch(0.62_0.24_27_/_0.12)] text-[oklch(0.8_0.2_27)]",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  refunded: {
    className:
      "border-[oklch(0.78_0.14_85_/_0.45)] bg-[oklch(0.78_0.14_85_/_0.12)] text-[oklch(0.88_0.12_85)]",
    icon: <Undo2 className="h-3.5 w-3.5" />,
  },
  // pulses like pending, otherwise it could not be told apart from refunded
  // once the caption is left out
  refunding: {
    className:
      "border-[oklch(0.78_0.14_85_/_0.45)] bg-[oklch(0.78_0.14_85_/_0.12)] text-[oklch(0.88_0.12_85)]",
    icon: <Undo2 className="h-3.5 w-3.5 animate-pulse" />,
  },
  pending: {
    className:
      "border-[oklch(0.72_0.19_245_/_0.4)] bg-[oklch(0.72_0.19_245_/_0.12)] text-[oklch(0.85_0.15_235)]",
    icon: <Clock className="h-3.5 w-3.5 animate-pulse" />,
  },
};

/** Status pill; `iconOnly` leaves the caption out and shows it on hover instead. */
function StatusPill({
  status,
  label,
  iconOnly = false,
}: {
  status: Status;
  label: string;
  iconOnly?: boolean;
}) {
  const caption = label.charAt(0).toUpperCase() + label.slice(1);
  const { className, icon } = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={caption}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border",
              className,
            )}
          >
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            "border border-white/10 bg-[oklch(0.16_0.03_262_/_0.85)] text-[11px] font-semibold shadow-none backdrop-blur-sm",
            className.split(" ").find((c) => c.startsWith("text-")),
          )}
        >
          {caption}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
        className,
      )}
    >
      {icon} {caption}
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
  const chainList = useChainList();
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
                  value={draft.origin ?? ""}
                  onChange={(e) => set("origin", e.target.value || undefined)}
                  className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
                >
                  <option value="" className="bg-[#141a2c] text-foreground">
                    Any chain
                  </option>
                  {chainList.map((c) => (
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
            <Label id="destination-chain-label" htmlFor="destination-chain">
              Destination chain
            </Label>
            <div className="relative">
              <select
                id="destination-chain"
                value={draft.destination ?? ""}
                onChange={(e) =>
                  set("destination", e.target.value || undefined)
                }
                className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-foreground [color-scheme:dark] focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
              >
                <option value="" className="bg-[#141a2c] text-foreground">
                  Any chain
                </option>
                {chainList.map((c) => (
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
                value={draft.sender ?? ""}
                onChange={(e) => set("sender", e.target.value || undefined)}
                placeholder="Search by address…"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
              />
            </div>
          )}

          <div>
            <Label htmlFor="receiver-address">Receiver address</Label>
            <input
              id="receiver-address"
              value={draft.receiver ?? ""}
              onChange={(e) => set("receiver", e.target.value || undefined)}
              placeholder="Search by address…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
            />
          </div>

          <div>
            <Label>Status</Label>
            <div className="relative">
              <select
                value={draft.status ?? ""}
                onChange={(e) =>
                  set(
                    "status",
                    (e.target.value || undefined) as Status | undefined,
                  )
                }
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
              id="amount-from"
              label="Amount from"
              value={draft.amountFrom ?? ""}
              onChange={(v) => set("amountFrom", v || undefined)}
            />
            <NumField
              id="amount-to"
              label="Amount to"
              value={draft.amountTo ?? ""}
              onChange={(v) => set("amountTo", v || undefined)}
            />
            <NumField
              id="native-token-amount-from"
              label="Token amount from"
              value={draft.tokenFrom ?? ""}
              onChange={(v) => set("tokenFrom", v || undefined)}
            />
            <NumField
              id="native-token-amount-to"
              label="Token amount to"
              value={draft.tokenTo ?? ""}
              onChange={(v) => set("tokenTo", v || undefined)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
          <button
            onClick={() => {
              setDraft({});
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

function Label({
  children,
  id,
  htmlFor,
}: {
  children: React.ReactNode;
  id?: string;
  htmlFor?: string;
}) {
  const className =
    "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";
  if (id || htmlFor) {
    return (
      <label id={id} htmlFor={htmlFor} className={`block ${className}`}>
        {children}
      </label>
    );
  }
  return <div className={className}>{children}</div>;
}

function NumField({
  label,
  value,
  onChange,
  disabled,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
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
  const [copied, setCopied] = useState(false);
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
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="relative shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
        aria-label="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[oklch(0.85_0.15_235)]" />
        ) : (
          <Clipboard className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date above time, or both on one line when `inline`. */
function DateTime({ date, inline = false }: { date: Date; inline?: boolean }) {
  return (
    <div className={cn("whitespace-nowrap", inline && "flex gap-1.5")}>
      <div>
        {date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
      <div>
        {date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
