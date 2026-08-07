import type { SettingsResponse } from "@/lib/api/settings";
import { getTokenInfo } from "@/lib/tokenInfo";
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
  _settings: SettingsResponse | undefined,
  tokenID: number | undefined,
): string {
  return getTokenInfo(tokenID).label;
}

/** Source tokens allowed for a src -> dst pair. Labels/icons from GET /tokenInfo. */
export function getSupportedSourceTokens(
  settings: SettingsResponse | undefined,
  srcChain: string | undefined,
  dstChain: string | undefined,
): BridgeToken[] {
  if (!settings || !srcChain || !dstChain) return [];

  const directions = getDirectionConfig(settings);
  const pairs = directions[srcChain]?.destChain?.[dstChain] ?? [];

  return pairs.map((pair) => {
    const info = getTokenInfo(pair.srcTokenID);
    return {
      id: String(pair.srcTokenID),
      tokenID: pair.srcTokenID,
      dstTokenID: pair.dstTokenID,
      symbol: info.label,
      name: info.label,
      icon: info.icon,
    };
  });
}
