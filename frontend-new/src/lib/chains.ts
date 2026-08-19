import { resolveAssetIconUrl } from "@/lib/assetIcons";
import type { SettingsResponse } from "@/lib/api/settings";
import { ChainApexBridgeEnum, ChainEnum } from "@/swagger/apexBridgeApiService";

export type ChainCategory = "apex" | "utxo" | "evm" | "svm";

/**
 * Accent used for a chain until `GET /chainInfo` says otherwise, and for one the
 * chainInfos config does not list. See useChainColor.
 */
export const DEFAULT_CHAIN_COLOR = "#3B92FF";

/** Family assumed for a chain the config gives no category - new ones are usually rollups. */
const DEFAULT_CHAIN_CATEGORY: ChainCategory = "evm";

/** Sorts after every chain the config placed explicitly. */
export const DEFAULT_CHAIN_ORDER = 99;

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

/**
 * `GET /chainInfo` entry - how the web-api's chainInfos config says a chain is
 * presented. Only `chain` and `color` are always served; the rest is optional
 * and falls back per field in chainMetaFrom.
 */
export type ChainInfo = {
  /** Chain id as `enabledChains` spells it, lowercase. */
  chain: string;
  color: string;
  label?: string;
  /** Logo file name served at `<apiUrl>/icons/chains/`. Ignored when iconUrl is set. */
  icon?: string;
  /** Absolute URL of a logo hosted elsewhere, used as-is. Wins over `icon`. */
  iconUrl?: string;
  order?: number;
  category?: ChainCategory;
  symbol?: string;
  apexFusion?: boolean;
};

export type ChainInfosResponse = {
  network: "mainnet" | "testnet";
  chains: ChainInfo[];
  /** Served for a chain the config does not list, when it sets one. */
  unknownChain?: ChainInfo;
};

/**
 * Resolved URL for `<img src>` - the logo the web-api serves under
 * /icons/chains/, a hosted `iconUrl` overriding it, or the bundled fallback.
 * See resolveAssetIconUrl.
 */
export const resolveChainIconUrl = (
  icon: string | undefined,
  iconUrl?: string,
): string => resolveAssetIconUrl("chain", icon, iconUrl);

export type ChainMeta = {
  label: string;
  /** Resolved URL for `<img src>`. See resolveChainIconUrl. */
  icon: string;
  order: number;
  category: ChainCategory;
  apexFusion?: boolean;
  symbol?: string;
};

/** The `/chainInfo` payload in the shape the lookups below want it. */
export type ChainInfoLookup = {
  byChain: Map<string, ChainInfo>;
  unknownChain?: ChainInfo;
};

const EMPTY_LOOKUP: ChainInfoLookup = { byChain: new Map() };

export function toChainInfoLookup(
  payload: ChainInfosResponse | undefined,
): ChainInfoLookup {
  if (!payload) return EMPTY_LOOKUP;
  return {
    byChain: new Map(
      (payload.chains ?? []).map((info) => [info.chain.toLowerCase(), info]),
    ),
    ...(payload.unknownChain ? { unknownChain: payload.unknownChain } : {}),
  };
}

/** "unichain" -> "Unichain", for a chain the config did not name. */
const capitalize = (id: string): string =>
  id ? id[0].toUpperCase() + id.slice(1) : id;

/**
 * Display metadata for a chain id. Always resolves: each field falls back on its
 * own, so a config that names a chain but gives it no logo still gets a label,
 * and a chain the config omits entirely still renders under its raw id.
 */
export function chainMetaFrom(
  lookup: ChainInfoLookup,
  chain: string,
): ChainMeta {
  const id = chain.toLowerCase();
  const info = lookup.byChain.get(id);
  const fallback = lookup.unknownChain;

  // Whichever entry supplies the logo supplies BOTH of its fields: iconUrl wins
  // over icon, so mixing this chain's icon with unknownChain's iconUrl would
  // paint every keyed chain with the fallback image.
  const logo = info?.icon || info?.iconUrl ? info : fallback;

  return {
    label: info?.label ?? capitalize(id),
    icon: resolveChainIconUrl(logo?.icon, logo?.iconUrl),
    order: info?.order ?? DEFAULT_CHAIN_ORDER,
    category: info?.category ?? fallback?.category ?? DEFAULT_CHAIN_CATEGORY,
    ...(info?.symbol ? { symbol: info.symbol } : {}),
    ...(info?.apexFusion ? { apexFusion: info.apexFusion } : {}),
  };
}

/**
 * Every chain the config lists, in its order - for the filters and pickers that
 * offer all known chains rather than only the ones a route enables.
 */
export function listChainsFrom(
  lookup: ChainInfoLookup,
): Array<{ id: string } & ChainMeta> {
  return [...lookup.byChain.keys()]
    .map((id) => ({ id, ...chainMetaFrom(lookup, id) }))
    .sort((a, b) => a.order - b.order);
}

/**
 * Whether the UI draws this chain at all. An entry in chainInfos is what makes
 * an enabled chain visible - but while that config has not loaded, or could not
 * be loaded, nothing is gated: a failed cosmetic request must not empty the
 * bridge's own chain pickers.
 */
export function isChainListedIn(
  lookup: ChainInfoLookup,
  chain: string,
): boolean {
  return lookup.byChain.size === 0 || lookup.byChain.has(chain.toLowerCase());
}

/**
 * Last `/chainInfo` payload, for the callers that cannot await one - the wallet
 * connect flow (lib/wallet/connect.ts) reaches for the chain list outside React.
 * Populated by the query in lib/api/chainInfo.ts.
 *
 * Components should use useChainMeta/useChainColor instead, so they re-render
 * when the payload lands; a memo that calls into here needs the query data in
 * its dependency list to recompute.
 */
let registry: ChainInfoLookup = EMPTY_LOOKUP;

/** Populate from `GET /chainInfo` (also keeps the sync helpers below working). */
export function setChainInfosRegistry(
  payload: ChainInfosResponse | undefined,
): void {
  registry = toChainInfoLookup(payload);
}

/** Display metadata from the last `/chainInfo` payload. See chainMetaFrom. */
export const getChainMeta = (chain: string): ChainMeta =>
  chainMetaFrom(registry, chain);

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
    if (!isChainListedIn(registry, id)) return [];
    const meta = getChainMeta(id);
    return [{ id, label: meta.label, img: meta.icon }];
  });
}

function getDirectionConfig(settings: SettingsResponse | undefined) {
  if (!settings) return {};
  return settings.directionConfig ?? {};
}

function toBridgeChain(id: string, meta: ChainMeta): BridgeChain {
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
    .filter(
      (id) =>
        settings.enabledChains.includes(id) && isChainListedIn(registry, id),
    )
    .map((id) => ({ id, meta: getChainMeta(id) }))
    .sort((a, b) => a.meta.order - b.meta.order)
    .map(({ id, meta }) => toBridgeChain(id, meta));
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
