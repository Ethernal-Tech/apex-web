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
import type { SettingsResponse } from "@/lib/api/settings";
import { ChainApexBridgeEnum, ChainEnum } from "@/swagger/apexBridgeApiService";

export type ChainCategory = "apex" | "utxo" | "evm" | "svm";

/**
 * Accent used for a chain until `GET /chainInfo` says otherwise, and for one the
 * chainInfos config does not list. See useChainColor.
 */
export const DEFAULT_CHAIN_COLOR = "#3B92FF";

/**
 * Chains kept out of every reported figure - TVL, TVB, the history chart and the
 * whole audit breakdown. Whatever `GET /lockedTokens` reports for them is
 * dropped before it is counted, listed, charted or labelled, so neither the
 * chain nor the tokens it holds are named anywhere.
 *
 * Reporting only: they stay bridgeable, since the bridge's own chain lists come
 * from the settings' `directionConfig`, not from here.
 */
export const UNREPORTED_CHAINS = new Set(["arbitrum", "scroll"]);

/** True for a chain no reported figure may include. See UNREPORTED_CHAINS. */
export const isUnreportedChain = (chain: string): boolean =>
  UNREPORTED_CHAINS.has(chain.toLowerCase());

const APEX_BRIDGE_CHAINS = new Set([
  "prime",
  "vector",
  "nexus",
  "cardano",
  "polygon",
  "ethereum",
  "katana",
  "sei",
  "arbitrum",
  "scroll",
  "unichain",
  "solana",
]);

export function isEvmChain(chain: string): boolean {
  return (
    chain === ChainEnum.Nexus ||
    chain === ChainEnum.Base ||
    chain === ChainEnum.Bsc ||
    chain === ChainEnum.Polygon ||
    chain === ChainEnum.Ethereum ||
    chain === ChainEnum.Katana ||
    chain === ChainEnum.Sei ||
    chain === ChainEnum.Arbitrum ||
    chain === ChainEnum.Scroll ||
    chain === ChainEnum.Unichain
  );
}

export function isCardanoChain(chain: string): boolean {
  return (
    chain === ChainEnum.Prime ||
    chain === ChainEnum.Vector ||
    chain === ChainEnum.Cardano
  );
}

export function isSolanaChain(chain: string): boolean {
  return chain === ChainEnum.Solana;
}

/** Input hint for a destination address on this chain. */
export function resolveDestinationAddressPlaceholder(
  chain: string,
  isMainnet: boolean,
): string {
  if (isEvmChain(chain)) return "0x…";
  if (isSolanaChain(chain)) return "base58…";
  if (isCardanoChain(chain)) {
    // Vector is always mainnet-style; prime/cardano follow the build network.
    const useAddr = isMainnet || chain === ChainEnum.Vector;
    return useAddr ? "addr1…" : "addr_test1…";
  }
  return "0x…";
}

export function isLZBridging(origin: string, destination: string): boolean {
  const apexChains = new Set<string>(Object.values(ChainApexBridgeEnum));
  return !apexChains.has(origin) || !apexChains.has(destination);
}

export type ChainMeta = {
  label: string;
  icon: string;
  order: number;
  category: ChainCategory;
  apexFusion?: boolean;
  symbol?: string;
};

/** Display metadata keyed by web-api `enabledChains` / ChainEnum ids. */
export const CHAIN_META: Record<string, ChainMeta> = {
  prime: {
    label: "Prime",
    icon: primeIcon,
    order: 1,
    category: "utxo",
    apexFusion: true,
    symbol: "AP3X",
  },
  cardano: {
    label: "Cardano",
    icon: adaIcon,
    order: 2,
    category: "utxo",
    symbol: "ADA",
  },
  vector: {
    label: "Vector",
    icon: vectorIcon,
    order: 3,
    category: "utxo",
    apexFusion: true,
    symbol: "AP3X",
  },
  nexus: {
    label: "Nexus",
    icon: nexusIcon,
    order: 4,
    category: "evm",
    apexFusion: true,
    symbol: "AP3X",
  },
  base: {
    label: "Base",
    icon: baseIcon,
    order: 5,
    category: "evm",
    symbol: "ETH",
  },
  bsc: {
    label: "BNB Chain",
    icon: bnbIcon,
    order: 6,
    category: "evm",
    symbol: "BNB",
  },
  polygon: {
    label: "Polygon",
    icon: polyIcon,
    order: 7,
    category: "evm",
    symbol: "POL",
  },
  ethereum: {
    label: "Ethereum",
    icon: ethIcon,
    order: 8,
    category: "evm",
    symbol: "ETH",
  },
  katana: {
    label: "Katana",
    icon: katanaIcon,
    order: 9,
    category: "evm",
    symbol: "ETH",
  },
  sei: {
    label: "Sei",
    icon: seiIcon,
    order: 10,
    category: "evm",
    symbol: "SEI",
  },
  arbitrum: {
    label: "Arbitrum",
    icon: arbIcon,
    order: 11,
    category: "evm",
    symbol: "ETH",
  },
  scroll: {
    label: "Scroll",
    icon: scrollIcon,
    order: 12,
    category: "evm",
    symbol: "ETH",
  },
  unichain: {
    label: "Unichain",
    icon: uniIcon,
    order: 13,
    category: "evm",
    symbol: "ETH",
  },
  solana: {
    label: "Solana",
    icon: solIcon,
    order: 14,
    category: "svm",
    symbol: "SOL",
  },
};

export type BridgeChain = {
  id: string;
  label: string;
  icon: string;
  category: ChainCategory;
  symbol?: string;
  apexFusion?: boolean;
  status: "live";
};

export type ChainFilterId = "all" | "apex" | "utxo" | "evm" | "svm";

export const CHAIN_FILTERS: { id: ChainFilterId; label: string }[] = [
  { id: "all", label: "All networks" },
  { id: "apex", label: "Apex Fusion" },
  { id: "utxo", label: "UTXO" },
  { id: "evm", label: "EVM" },
  { id: "svm", label: "SVM" },
];

export function chainMatchesFilter(
  chain: BridgeChain,
  filter: ChainFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "apex") return Boolean(chain.apexFusion);
  return chain.category === filter;
}

export function getEnabledChainNodes(enabledChains: string[] | undefined) {
  if (!enabledChains?.length) return [];
  return enabledChains.flatMap((id) => {
    const meta = CHAIN_META[id];
    if (!meta) return [];
    return [{ id, label: meta.label, img: meta.icon }];
  });
}

function getDirectionConfig(settings: SettingsResponse | undefined) {
  if (!settings) return {};
  return settings.directionConfig ?? {};
}

function toBridgeChain(id: string): BridgeChain | null {
  const meta = CHAIN_META[id];
  if (!meta) return null;
  return {
    id,
    label: meta.label,
    icon: meta.icon,
    category: meta.category,
    symbol: meta.symbol,
    apexFusion: meta.apexFusion,
    status: "live",
  };
}

function prepareChainsList(
  ids: string[],
  settings: SettingsResponse,
): BridgeChain[] {
  return ids
    .filter((id) => settings.enabledChains.includes(id) && CHAIN_META[id])
    .sort((a, b) => CHAIN_META[a].order - CHAIN_META[b].order)
    .flatMap((id) => {
      const chain = toBridgeChain(id);
      return chain ? [chain] : [];
    });
}

/** Source chains that have at least one destination. */
export function getSrcChains(
  settings: SettingsResponse | undefined,
): BridgeChain[] {
  if (!settings) return [];
  const directions = getDirectionConfig(settings);
  const ids = Object.keys(directions).filter(
    (src) => Object.keys(directions[src]?.destChain ?? {}).length > 0,
  );
  return prepareChainsList(ids, settings);
}

/** Destinations allowed for a given source. */
export function getDstChains(
  sourceId: string | undefined,
  settings: SettingsResponse | undefined,
): BridgeChain[] {
  if (!settings || !sourceId) return [];
  const directions = getDirectionConfig(settings);
  const ids = Object.keys(directions[sourceId]?.destChain ?? {});
  return prepareChainsList(ids, settings);
}
