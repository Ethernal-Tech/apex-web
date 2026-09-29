import appSettings from "@/settings/appSettings";

/**
 * Block explorer per chain, keyed by the web-api's chain ids - the same ids the
 * chainInfos config uses. Every one of these serves an address at
 * `/address/<addr>`.
 *
 * Which side is used comes from the build's `isMainnet`, deliberately not from
 * the header's network toggle: that toggle is presentational, while the
 * addresses on the page come from the API this build talks to. A mainnet address
 * has to open in a mainnet explorer whatever the toggle happens to say.
 */
const ADDRESS_EXPLORERS: Record<
  string,
  { mainnet?: string; testnet?: string }
> = {
  prime: {
    mainnet: "https://apexscan.org/en",
    testnet: "https://beta-explorer.prime.testnet.apexfusion.org/en",
  },
  vector: {
    mainnet: "https://explorer.vector.mainnet.apexfusion.org",
    testnet: "https://explorer.vector.testnet.apexfusion.org",
  },
  nexus: {
    mainnet: "https://explorer.nexus.mainnet.apexfusion.org",
    testnet: "https://explorer.nexus.testnet.apexfusion.org",
  },
  cardano: {
    mainnet: "https://cardanoscan.io",
    // The bridge's Cardano testnet is preview, so preview.cardanoscan.io.
    testnet: "https://preview.cardanoscan.io",
  },
  solana: {
    mainnet: "https://explorer.solana.com",
    testnet: "https://explorer.solana.com",
  },
  base: {
    mainnet: "https://basescan.org",
    testnet: "https://sepolia.basescan.org",
  },
  bsc: {
    mainnet: "https://bscscan.com",
    testnet: "https://testnet.bscscan.com",
  },
  polygon: {
    mainnet: "https://polygonscan.com",
    testnet: "https://amoy.polygonscan.com",
  },
  ethereum: {
    mainnet: "https://etherscan.io",
    testnet: "https://sepolia.etherscan.io",
  },
  katana: {
    mainnet: "https://katanascan.com",
    testnet: "https://bokuto.katanascan.com",
  },
  sei: {
    mainnet: "https://seiscan.io",
    testnet: "https://testnet.seiscan.io",
  },
  arbitrum: {
    mainnet: "https://arbiscan.io",
    testnet: "https://sepolia.arbiscan.io",
  },
  scroll: {
    mainnet: "https://scrollscan.com",
    testnet: "https://sepolia.scrollscan.com",
  },
  unichain: {
    mainnet: "https://unichain.blockscout.com",
    testnet: "https://unichain-sepolia.blockscout.com",
  },
};

/** One host serves every Solana cluster, so anything but mainnet says which. */
const SOLANA_DEVNET_QUERY = "?cluster=devnet";

/**
 * Where to look this address up on chain. Undefined for a chain with no explorer
 * listed for the network in use, so a caller can fall back to plain text rather
 * than linking somewhere the address does not exist.
 */
export function explorerAddressUrl(
  chain: string,
  address: string,
): string | undefined {
  const id = chain.toLowerCase();
  const explorer = ADDRESS_EXPLORERS[id];
  const base = appSettings.isMainnet ? explorer?.mainnet : explorer?.testnet;
  if (!base) return undefined;

  const url = `${base.replace(/\/$/, "")}/address/${encodeURIComponent(address)}`;
  return id === "solana" && !appSettings.isMainnet
    ? `${url}${SOLANA_DEVNET_QUERY}`
    : url;
}
