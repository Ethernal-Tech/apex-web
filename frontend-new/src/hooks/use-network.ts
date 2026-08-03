import { useSyncExternalStore } from "react";

export type SkylineNetwork = "mainnet" | "testnet";

export const NETWORKS: { id: SkylineNetwork; label: string }[] = [
  { id: "mainnet", label: "Mainnet" },
  { id: "testnet", label: "Testnet" },
];

const STORAGE_KEY = "skyline-network";

// Tiny cross-component store so every network switch in the app stays in sync,
// and the choice survives navigation and reloads.
const listeners = new Set<() => void>();
let current: SkylineNetwork = "mainnet";
let hydrated = false;

function read(): SkylineNetwork {
  try {
    return localStorage.getItem(STORAGE_KEY) === "testnet" ? "testnet" : "mainnet";
  } catch {
    return "mainnet";
  }
}

function emit() {
  for (const l of listeners) l();
}

function handleStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  current = read();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): SkylineNetwork {
  if (!hydrated) {
    hydrated = true;
    current = read();
  }
  return current;
}

// SSR always renders mainnet; React re-checks the store right after hydration.
const getServerSnapshot = (): SkylineNetwork => "mainnet";

export function setNetwork(next: SkylineNetwork) {
  if (next === current) return;
  current = next;
  hydrated = true;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  emit();
}

export function useNetwork(): SkylineNetwork {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
