import { resolveAssetIconUrl } from "@/lib/assetIcons";

export type TokenInfoDto = {
  tokenID: number;
  label: string;
  /** Icon file name served at `<apiUrl>/icons/tokens/`. Ignored when iconUrl is set. */
  icon: string;
  /** Absolute URL of an icon hosted elsewhere, used as-is. Wins over `icon`. */
  iconUrl?: string;
};

export type TokenInfosResponse = {
  network: string;
  tokens: TokenInfoDto[];
  unknownToken: TokenInfoDto;
};

export type TokenInfo = {
  tokenID: number;
  label: string;
  /** Resolved URL for `<img src>`. See resolveTokenIconUrl. */
  icon: string;
};

/**
 * Stands in until `GET /tokenInfo` lands, and when it names no unknownToken. It
 * carries no icon on purpose: resolveTokenIconUrl then yields the bundled
 * fallback rather than a URL the web-api may not serve.
 */
const DEFAULT_UNKNOWN: TokenInfoDto = {
  tokenID: 0,
  label: "",
  icon: "",
};

let byId = new Map<number, TokenInfoDto>();
let unknownToken: TokenInfoDto = DEFAULT_UNKNOWN;

/** Populate from `GET /tokenInfo` (also keeps sync helpers working). */
export function setTokenInfosRegistry(payload: TokenInfosResponse | undefined) {
  byId = new Map((payload?.tokens ?? []).map((t) => [t.tokenID, t]));
  unknownToken = payload?.unknownToken ?? DEFAULT_UNKNOWN;
}

/** @deprecated Prefer setTokenInfosRegistry; kept for settings ecosystemTokens bootstrap. */
export function setTokenNames(
  tokens: Array<{ id: number; name: string }> | undefined,
): void {
  if (!tokens?.length) return;
  // Only fill gaps until /tokenInfo loads - do not overwrite API metadata.
  for (const t of tokens) {
    if (byId.has(t.id)) continue;
    byId.set(t.id, {
      tokenID: t.id,
      label: t.name,
      // name only - the icon comes from /tokenInfo, which knows the file name
      icon: "",
    });
  }
}

/**
 * Resolved URL for `<img src>` - the icon the web-api serves under
 * /icons/tokens/, a hosted `iconUrl` overriding it, or the bundled fallback.
 * See resolveAssetIconUrl.
 */
export const resolveTokenIconUrl = (
  icon: string | undefined,
  iconUrl?: string,
): string => resolveAssetIconUrl("token", icon, iconUrl);

export function getTokenInfo(tokenID: number | undefined): TokenInfo {
  if (tokenID === undefined) {
    return {
      tokenID: 0,
      label: "",
      icon: resolveTokenIconUrl(unknownToken.icon, unknownToken.iconUrl),
    };
  }

  const meta = byId.get(tokenID) ?? {
    ...unknownToken,
    tokenID,
    label: unknownToken.label || `Token ${tokenID}`,
  };

  return {
    tokenID: meta.tokenID,
    label: meta.label,
    icon: resolveTokenIconUrl(meta.icon, meta.iconUrl),
  };
}
