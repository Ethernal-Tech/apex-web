import type { SettingsResponse } from "@/lib/api/settings";
import { CHAIN_META } from "@/lib/chains";
import primeIcon from "@/assets/chains/prime.svg?url";
import type {
  BridgingSettingsDirectionConfigDto,
  BridgingSettingsEcosystemTokenDto,
  BridgingSettingsTokenDto,
} from "@/swagger/apexBridgeApiService";

export const LovelaceTokenName = "lovelace";

/**
 * Accent used for a token until `GET /tokenInfo` says otherwise, and for one the
 * tokenInfos config gives no color at all. See useTokenColor.
 */
export const DEFAULT_TOKEN_COLOR = "#3B92FF";
export interface IDirectionFullConfig {
  directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };
  ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
}

export type BridgeToken = {
  id: string;
  tokenID: number;
  dstTokenID: number;
  symbol: string;
  name: string;
  icon: string;
};

function getDirectionConfig(settings: SettingsResponse | undefined) {
  if (!settings) return {};
  return settings.directionConfig ?? {};
}

export function getTokenConfig(
  settings: SettingsResponse | undefined,
  chain: string,
  tokenID: number,
): BridgingSettingsTokenDto | undefined {
  return getDirectionConfig(settings)[chain]?.tokens?.[tokenID];
}

export const getCurrencyID = (
  settings: IDirectionFullConfig,
  chain: string,
): number | undefined => {
  if (
    !settings.directionConfig[chain] ||
    !settings.directionConfig[chain].tokens
  ) {
    return;
  }

  const currencyID = Object.keys(settings.directionConfig[chain].tokens).find(
    (x: string) =>
      settings.directionConfig[chain].tokens[+x].chainSpecific ===
      LovelaceTokenName,
  );

  return currencyID ? +currencyID : undefined;
};

export function getTokenDisplayName(
  settings: SettingsResponse | undefined,
  tokenID: number | undefined,
): string {
  if (tokenID === undefined) return "";
  return (
    settings?.ecosystemTokens?.find((t) => t.id === tokenID)?.name ??
    `Token ${tokenID}`
  );
}

function resolveTokenIcon(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("AP3X") || s.includes("APEX")) return CHAIN_META.prime.icon;
  if (s.includes("ADA")) return CHAIN_META.cardano.icon;
  if (s.includes("SOL")) return CHAIN_META.solana.icon;
  if (s.includes("BNB") || s.includes("BSC")) return CHAIN_META.bsc.icon;
  if (s.includes("POL") || s.includes("MATIC")) return CHAIN_META.polygon.icon;
  if (s.includes("SEI")) return CHAIN_META.sei.icon;
  if (s.includes("ETH") || s.includes("BASE") || s.includes("ARB"))
    return CHAIN_META.ethereum.icon;
  return primeIcon;
}

/** Source tokens allowed for a src -> dst pair. */
export function getSupportedSourceTokens(
  settings: SettingsResponse | undefined,
  srcChain: string | undefined,
  dstChain: string | undefined,
): BridgeToken[] {
  if (!settings || !srcChain || !dstChain) return [];

  const directions = getDirectionConfig(settings);
  const pairs = directions[srcChain]?.destChain?.[dstChain] ?? [];
  const nameById = new Map(
    (settings.ecosystemTokens ?? []).map((t) => [t.id, t.name] as const),
  );

  return pairs.map((pair) => {
    const name = nameById.get(pair.srcTokenID) ?? `Token ${pair.srcTokenID}`;
    return {
      id: String(pair.srcTokenID),
      tokenID: pair.srcTokenID,
      dstTokenID: pair.dstTokenID,
      symbol: name,
      name,
      icon: resolveTokenIcon(name),
    };
  });
}
