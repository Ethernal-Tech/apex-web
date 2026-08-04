import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FooterSocials, FooterLegal } from "@/components/ui/footer-socials";
import { NetworkToggle } from "@/components/NetworkToggle";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clipboard,
  ExternalLink,
  Filter,
  Search,
  Wallet,
  X,
  XCircle,
  Clock,
} from "lucide-react";
import logoAsset from "@/assets/skyline-logo-transparent.png";
import primeIcon from "@/assets/chains/prime.svg?url";
import nexusIcon from "@/assets/chains/nexus.svg?url";
import vectorIcon from "@/assets/chains/vector.svg?url";
import adaIcon from "@/assets/chains/cardano.svg?url";
import ethIcon from "@/assets/chains/ethereum.svg?url";
import bnbIcon from "@/assets/chains/bnb.svg?url";
import baseIcon from "@/assets/chains/coinbase.svg?url";

export const Route = createFileRoute("/transactions")({
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

const CHAINS: Record<string, ChainMeta> = {
  prime: { id: "prime", label: "Prime", icon: primeIcon, symbol: "AP3X" },
  nexus: { id: "nexus", label: "Nexus", icon: nexusIcon, symbol: "AP3X" },
  vector: { id: "vector", label: "Vector", icon: vectorIcon, symbol: "AP3X" },
  ada: { id: "ada", label: "Cardano", icon: adaIcon, symbol: "ADA" },
  eth: { id: "eth", label: "Ethereum", icon: ethIcon, symbol: "ETH" },
  bnb: { id: "bnb", label: "BNB Chain", icon: bnbIcon, symbol: "BNB" },
  base: { id: "base", label: "Base", icon: baseIcon, symbol: "ETH" },
};

type Status = "success" | "pending" | "failed";

type Tx = {
  id: string;
  origin: string;
  destination: string;
  amount: number;
  tokenAmount: number | null;
  receiver: string;
  sender: string;
  createdAt: Date;
  finishedAt: Date | null;
  status: Status;
};

const RECEIVER_A =
  "addr_test1qrsknr4y5znjqz3xnp8sdvhur0k5adfhcprujfjcv8fyz4nu5xr6ldyfxu4yggkjunlkm9x5rq0mne4d4vgz3xchw2sqnr3wh";
const RECEIVER_B = "0x7a2cF4d9b1eE8d3cA0f6B91C2E5a7D9b3c4e8F1a";
const RECEIVER_C = "0x9b3c4e8F1a7a2cF4d9b1eE8d3cA0f6B91C2E5a7D";

// Senders are assigned round-robin below. RECEIVER_B matches the demo wallet in
// connect(), so several transactions belong to the connected user's own history.
const SENDERS = [RECEIVER_B, RECEIVER_A, RECEIVER_C];

function h(id: string) {
  return "0x" + id.padEnd(32, "0").slice(0, 32);
}

const MOCK_TXS: Tx[] = (
  [
    {
      id: h("a1"),
      origin: "prime",
      destination: "ada",
      amount: 2.00001,
      tokenAmount: null,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-07-13T12:09:24"),
      finishedAt: new Date("2026-07-13T12:20:00"),
      status: "success",
    },
    {
      id: h("a2"),
      origin: "prime",
      destination: "ada",
      amount: 2.00001,
      tokenAmount: null,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-07-11T10:23:46"),
      finishedAt: new Date("2026-07-11T10:32:40"),
      status: "success",
    },
    {
      id: h("a3"),
      origin: "prime",
      destination: "ada",
      amount: 2.00001,
      tokenAmount: null,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-07-08T11:40:23"),
      finishedAt: new Date("2026-07-08T11:53:30"),
      status: "success",
    },
    {
      id: h("a4"),
      origin: "nexus",
      destination: "prime",
      amount: 148.42,
      tokenAmount: 148.42,
      receiver: RECEIVER_B,
      createdAt: new Date("2026-07-05T09:14:00"),
      finishedAt: new Date("2026-07-05T09:22:11"),
      status: "success",
    },
    {
      id: h("a5"),
      origin: "vector",
      destination: "nexus",
      amount: 12.5,
      tokenAmount: 12.5,
      receiver: RECEIVER_B,
      createdAt: new Date("2026-07-02T16:44:00"),
      finishedAt: null,
      status: "pending",
    },
    {
      id: h("a6"),
      origin: "eth",
      destination: "base",
      amount: 0.42,
      tokenAmount: 0.42,
      receiver: RECEIVER_C,
      createdAt: new Date("2026-06-29T18:02:19"),
      finishedAt: new Date("2026-06-29T18:07:04"),
      status: "success",
    },
    {
      id: h("a7"),
      origin: "bnb",
      destination: "eth",
      amount: 4.9,
      tokenAmount: 4.9,
      receiver: RECEIVER_C,
      createdAt: new Date("2026-06-24T08:12:56"),
      finishedAt: new Date("2026-06-24T08:18:41"),
      status: "failed",
    },
    {
      id: h("a8"),
      origin: "prime",
      destination: "vector",
      amount: 501,
      tokenAmount: 501,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-06-19T21:04:00"),
      finishedAt: new Date("2026-06-19T21:12:20"),
      status: "success",
    },
    {
      id: h("a9"),
      origin: "nexus",
      destination: "ada",
      amount: 78.11,
      tokenAmount: 78.11,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-06-14T14:33:47"),
      finishedAt: new Date("2026-06-14T14:41:00"),
      status: "success",
    },
    {
      id: h("aa"),
      origin: "base",
      destination: "eth",
      amount: 1.02,
      tokenAmount: 1.02,
      receiver: RECEIVER_C,
      createdAt: new Date("2026-06-11T07:20:00"),
      finishedAt: new Date("2026-06-11T07:26:13"),
      status: "success",
    },
    {
      id: h("ab"),
      origin: "prime",
      destination: "nexus",
      amount: 25,
      tokenAmount: 25,
      receiver: RECEIVER_B,
      createdAt: new Date("2026-06-08T13:12:00"),
      finishedAt: new Date("2026-06-08T13:18:20"),
      status: "success",
    },
    {
      id: h("ac"),
      origin: "vector",
      destination: "ada",
      amount: 3.33,
      tokenAmount: 3.33,
      receiver: RECEIVER_A,
      createdAt: new Date("2026-06-04T11:00:00"),
      finishedAt: new Date("2026-06-04T11:09:44"),
      status: "success",
    },
    {
      id: h("ad"),
      origin: "eth",
      destination: "bnb",
      amount: 0.9,
      tokenAmount: 0.9,
      receiver: RECEIVER_C,
      createdAt: new Date("2026-05-30T19:22:14"),
      finishedAt: null,
      status: "pending",
    },
  ] as Omit<Tx, "sender">[]
).map((t, i) => ({ ...t, sender: SENDERS[i % SENDERS.length] }));

type SortKey =
  | "createdAt"
  | "finishedAt"
  | "amount"
  | "tokenAmount"
  | "origin"
  | "destination"
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
};

function TransactionsPage() {
  const isCompact = useMediaQuery("(max-width: 1000px)");

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<"world" | "user">("world");

  const isConnected = Boolean(walletAddress);
  const connect = () =>
    setWalletAddress("0x7a2cF4d9b1eE8d3cA0f6B91C2E5a7D9b3c4e8F1a");
  const disconnect = () => {
    setWalletAddress(null);
    setView("world");
  };

  const changeView = (v: "world" | "user") => {
    if (v === "user" && !isConnected) return;
    setView(v);
    setPage(1);
    // Origin/sender filters only exist in world view — drop them when leaving it.
    if (v === "user") setFilters((f) => ({ ...f, origin: "", sender: "" }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base =
      view === "user" && walletAddress
        ? MOCK_TXS.filter(
            (t) => t.sender === walletAddress || t.receiver === walletAddress,
          )
        : MOCK_TXS;
    return base.filter((t) => {
      if (q) {
        const hay =
          `${t.id} ${CHAINS[t.origin]?.label} ${CHAINS[t.destination]?.label} ${t.sender} ${t.receiver}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.destination && t.destination !== filters.destination)
        return false;
      if (
        filters.receiver &&
        !t.receiver.toLowerCase().includes(filters.receiver.toLowerCase())
      )
        return false;
      if (filters.amountFrom && t.amount < Number(filters.amountFrom))
        return false;
      if (filters.amountTo && t.amount > Number(filters.amountTo)) return false;
      if (
        filters.tokenFrom &&
        (t.tokenAmount ?? -Infinity) < Number(filters.tokenFrom)
      )
        return false;
      if (
        filters.tokenTo &&
        (t.tokenAmount ?? Infinity) > Number(filters.tokenTo)
      )
        return false;
      // Origin chain and sender address are only filterable in the network-wide view.
      if (view === "world") {
        if (filters.origin && t.origin !== filters.origin) return false;
        if (
          filters.sender &&
          !t.sender.toLowerCase().includes(filters.sender.toLowerCase())
        )
          return false;
      }
      return true;
    });
  }, [search, filters, view, walletAddress]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case "createdAt":
          av = a.createdAt.getTime();
          bv = b.createdAt.getTime();
          break;
        case "finishedAt":
          av = a.finishedAt?.getTime() ?? 0;
          bv = b.finishedAt?.getTime() ?? 0;
          break;
        case "amount":
          av = a.amount;
          bv = b.amount;
          break;
        case "tokenAmount":
          av = a.tokenAmount ?? -1;
          bv = b.tokenAmount ?? -1;
          break;
        case "origin":
          av = a.origin;
          bv = b.origin;
          break;
        case "destination":
          av = a.destination;
          bv = b.destination;
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header — mirrors bridge-app */}
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
                value={isCompact ? "$12.45M" : "$12,450,238.71"}
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
                value={isCompact ? "$89.20M" : "$89,204,816.34"}
                interactive
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/bridge-app"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
            >
              Transfer <ArrowRight className="h-3.5 w-3.5" />
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

        <div className="flex w-full items-center justify-center gap-3 px-4 pb-3 min-[875px]:hidden">
          <Link
            to="/audit"
            title="Open the full proof-of-reserves audit"
            aria-label="Open audit"
          >
            <StatChip label="TVL" value="$12.45M" compact interactive />
          </Link>
          <Link
            to="/audit"
            title="Open the full proof-of-reserves audit"
            aria-label="Open audit"
          >
            <StatChip label="TVB" value="$89.20M" compact interactive />
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="bg-hero-glow relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[oklch(0.55_0.22_250_/_0.2)] blur-3xl" />

        <div className="container-page relative py-6 md:py-8">
          <div className="mx-auto mb-6 flex max-w-6xl flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
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
                  placeholder="Search hash, chain, address…"
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
          <div className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center gap-3">
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
                : "Only transfers involving your connected wallet."}
            </span>
          </div>

          {/* Card containing table */}
          <div className="mx-auto max-w-6xl">
            <div className="card-glow relative overflow-hidden rounded-3xl">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.19_245_/_0.6)] to-transparent" />

              <div className="overflow-x-auto">
                <table
                  className={`w-full border-collapse text-sm ${isCompact ? "min-w-[600px]" : "min-w-[880px]"}`}
                >
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Th
                        onClick={() => toggleSort("origin")}
                        active={sortKey === "origin"}
                        dir={sortDir}
                      >
                        Origin
                      </Th>
                      <Th
                        onClick={() => toggleSort("destination")}
                        active={sortKey === "destination"}
                        dir={sortDir}
                      >
                        {isCompact ? "Dest" : "Destination"}
                      </Th>
                      <Th
                        onClick={() => toggleSort("amount")}
                        active={sortKey === "amount"}
                        dir={sortDir}
                      >
                        Amount
                      </Th>
                      <Th
                        onClick={() => toggleSort("tokenAmount")}
                        active={sortKey === "tokenAmount"}
                        dir={sortDir}
                      >
                        Token amount
                      </Th>
                      <th className="px-5 py-4">Receiver</th>
                      <Th
                        onClick={() => toggleSort("createdAt")}
                        active={sortKey === "createdAt"}
                        dir={sortDir}
                      >
                        Created
                      </Th>
                      <Th
                        onClick={() => toggleSort("finishedAt")}
                        active={sortKey === "finishedAt"}
                        dir={sortDir}
                      >
                        Finished
                      </Th>
                      <Th
                        onClick={() => toggleSort("status")}
                        active={sortKey === "status"}
                        dir={sortDir}
                      >
                        Status
                      </Th>
                      {!isCompact && (
                        <th className="px-5 py-4 text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((t) => (
                      <TxRow key={t.id} tx={t} compact={isCompact} />
                    ))}
                    {paged.length === 0 && (
                      <tr>
                        <td
                          colSpan={isCompact ? 8 : 9}
                          className="px-5 py-14 text-center text-sm text-muted-foreground"
                        >
                          No transactions match your filters.
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <th className="px-5 py-4">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 uppercase tracking-[0.18em] transition-colors ${
          active ? "text-[oklch(0.85_0.15_235)]" : "hover:text-foreground"
        }`}
      >
        {children}
        <ChevronsUpDown
          className={`h-3 w-3 ${active ? (dir === "asc" ? "rotate-180" : "") : "opacity-60"}`}
        />
      </button>
    </th>
  );
}

function TxRow({ tx, compact }: { tx: Tx; compact: boolean }) {
  const origin = CHAINS[tx.origin];
  const dest = CHAINS[tx.destination];
  const navigate = useNavigate();

  const linkProps = {
    to: "/transaction/$id" as const,
    params: { id: tx.id },
    search: {
      src: tx.origin,
      dst: tx.destination,
      amount: String(tx.amount),
      addr: tx.receiver,
      sender: tx.receiver,
    },
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
      <td className="px-5 py-4">
        <ChainCell chain={origin} compact={compact} />
      </td>
      <td className="px-5 py-4">
        <ChainCell chain={dest} compact={compact} />
      </td>
      <td className="px-5 py-4">
        <div className="font-display text-sm font-semibold text-foreground">
          {formatNumber(tx.amount)}
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {origin?.symbol}
        </div>
      </td>
      <td className="px-5 py-4">
        {tx.tokenAmount != null ? (
          <div className="font-display text-sm text-foreground">
            {formatNumber(tx.tokenAmount)}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          {shortHash(tx.receiver)}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(tx.receiver);
            }}
            className="text-muted-foreground/60 transition-colors hover:text-foreground"
            aria-label="Copy address"
          >
            <Clipboard className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="px-5 py-4 text-xs text-muted-foreground">
        {formatDate(tx.createdAt)}
      </td>
      <td className="px-5 py-4 text-xs text-muted-foreground">
        {tx.finishedAt ? (
          formatDate(tx.finishedAt)
        ) : (
          <span className="text-[oklch(0.85_0.15_235)]">Pending</span>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusPill status={tx.status} />
      </td>
      {!compact && (
        <td className="px-5 py-4 text-right">
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

function ChainCell({
  chain,
  compact,
}: {
  chain?: ChainMeta;
  compact?: boolean;
}) {
  if (!chain) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-7 w-7 overflow-hidden rounded-full"
        title={compact ? chain.label : undefined}
      >
        <img
          src={chain.icon}
          alt={chain.label}
          className="h-full w-full object-cover"
        />
      </div>
      {!compact && (
        <span className="font-medium text-foreground">{chain.label}</span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_155_/_0.4)] bg-[oklch(0.72_0.19_155_/_0.12)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.85_0.18_155)]">
        <CheckCircle2 className="h-3.5 w-3.5" /> Success
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.62_0.24_27_/_0.5)] bg-[oklch(0.62_0.24_27_/_0.12)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.8_0.2_27)]">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.72_0.19_245_/_0.4)] bg-[oklch(0.72_0.19_245_/_0.12)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.85_0.15_235)]">
      <Clock className="h-3.5 w-3.5 animate-pulse" /> Pending
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[oklch(0.72_0.19_245_/_0.6)] focus:outline-none"
      />
    </div>
  );
}

function formatAddress(a: string | null) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function shortHash(a: string) {
  if (a.length <= 14) return a;
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

function formatNumber(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
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
