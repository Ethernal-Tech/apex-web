import { useLayoutEffect, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { StatusKind } from "@/lib/bridging/statusUtils";
import { peekWalletReturnTo, setWalletReturnTo } from "@/lib/returnTo";

export type TransactionsView = "world" | "user";
export type TransactionsSortKey =
  | "createdAt"
  | "finishedAt"
  | "amount"
  | "tokenAmount"
  | "origin"
  | "destination"
  | "sender"
  | "receiver"
  | "status";
export type TransactionsSortDir = "asc" | "desc";

export type TransactionsFilters = {
  origin?: string;
  destination?: string;
  sender?: string;
  receiver?: string;
  amountFrom?: string;
  amountTo?: string;
  tokenFrom?: string;
  tokenTo?: string;
  status?: StatusKind;
};

export const TRANSACTIONS_PAGE_SIZES = [5, 10, 25, 50] as const;

export function compactTransactionFilters(
  filters: TransactionsFilters,
): TransactionsFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => Boolean(value)),
  ) as TransactionsFilters;
}

export type TransactionsListState = {
  /** Absent until the user picks a tab. */
  view?: TransactionsView;
  addrSearch: string;
  sortKey: TransactionsSortKey;
  sortDir: TransactionsSortDir;
  page: number;
  pageSize: number;
  filters: TransactionsFilters;
};

const STORAGE_KEY = "skyline.transactionsList";

const DEFAULT_STATE: TransactionsListState = {
  addrSearch: "",
  sortKey: "createdAt",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
  filters: {},
};

const listeners = new Set<() => void>();

function isHistoryPath(pathname: string): boolean {
  return pathname === "/transactions" || pathname.startsWith("/transaction/");
}

function freshState(): TransactionsListState {
  return { ...DEFAULT_STATE, filters: {} };
}

let state: TransactionsListState = freshState();

function parseStorage(raw: string): TransactionsListState | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<TransactionsListState>;
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      filters: compactTransactionFilters(
        parsed.filters && typeof parsed.filters === "object"
          ? parsed.filters
          : {},
      ),
    };
  } catch {
    return undefined;
  }
}

function writeStorage(next: TransactionsListState): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota
  }
}

function readStorage(): TransactionsListState | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return parseStorage(raw);
  } catch {
    return undefined;
  }
}

function clearStorage(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private mode / quota
  }
}

function consumeStorage(): void {
  const stored = readStorage();
  clearStorage();
  if (!stored) return;
  state = stored;
  emit();
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function getTransactionsListState(): TransactionsListState {
  return state;
}

export function updateTransactionsListState(
  patch: Partial<TransactionsListState>,
): void {
  state = { ...state, ...patch };
  emit();
}

export function resetTransactionsListState(): void {
  state = freshState();
  emit();
}

/** Snapshot the list so wallet connect can reload /bridge-app without losing it. */
export function leaveHistoryForWallet(returnTo: string): void {
  writeStorage(state);
  setWalletReturnTo(returnTo);
}

/**
 * Keep list UI state in memory on History ↔ tx detail.
 * Persist to sessionStorage only for the wallet-connect detour (that page often
 * reloads). Refresh and leaving the flow start empty.
 */
export function TransactionsListLifetime(): null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useLayoutEffect(() => {
    if (isHistoryPath(pathname)) {
      consumeStorage();
      return;
    }
    if (pathname === "/bridge-app" && peekWalletReturnTo()) return;
    resetTransactionsListState();
    clearStorage();
  }, [pathname]);
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTransactionsListState(): [
  TransactionsListState,
  typeof updateTransactionsListState,
] {
  const snapshot = useSyncExternalStore(
    subscribe,
    getTransactionsListState,
    () => DEFAULT_STATE,
  );
  return [snapshot, updateTransactionsListState];
}
