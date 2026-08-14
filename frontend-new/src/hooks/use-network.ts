import appSettings from "@/settings/appSettings";

export type SkylineNetwork = "mainnet" | "testnet";

export const NETWORKS: { id: SkylineNetwork; label: string }[] = [
  { id: "mainnet", label: "Mainnet" },
  { id: "testnet", label: "Testnet" },
];

/** Live mainnet still runs the previous frontend. */
export const SKYLINE_MAINNET_URL = "https://skylinebridge.tech";

/** Testnet deployment of this app. */
export const SKYLINE_TESTNET_URL = "https://skyline.testnet.ethernal.work";

export function currentNetwork(): SkylineNetwork {
  return appSettings.isMainnet ? "mainnet" : "testnet";
}

export function useNetwork(): SkylineNetwork {
  return currentNetwork();
}

/**
 * New-app path → old Skyline mainnet path. Unlisted paths (transactions,
 * audit, privacy, terms, /transaction/:id) are the same on both.
 */
const NEW_TO_OLD_MAINNET: Record<string, string> = {
  "/": "/landing",
  "/landing": "/landing",
  "/bridge-app": "/app",
  "/about-us": "/landing",
  "/contact": "/landing",
};

function pathOnPeerNetwork(pathname: string, dest: SkylineNetwork): string {
  if (dest === "mainnet") {
    return NEW_TO_OLD_MAINNET[pathname] ?? pathname;
  }
  return pathname;
}

/** Leave this deployment for the equivalent page on the other network. */
export function setNetwork(next: SkylineNetwork) {
  if (next === currentNetwork()) return;
  const origin = next === "mainnet" ? SKYLINE_MAINNET_URL : SKYLINE_TESTNET_URL;
  const path = pathOnPeerNetwork(window.location.pathname, next);
  window.location.assign(
    `${origin}${path}${window.location.search}${window.location.hash}`,
  );
}
