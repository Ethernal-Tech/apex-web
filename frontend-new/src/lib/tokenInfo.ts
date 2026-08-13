import apexIcon from "@/assets/token-icons/apex.svg?url";
import ethIcon from "@/assets/token-icons/eth.svg?url";
import polygonIcon from "@/assets/token-icons/polygon.svg?url";
import seiIcon from "@/assets/token-icons/sei.svg?url";
import solanaIcon from "@/assets/token-icons/solana.svg?url";
import unknownIcon from "@/assets/token-icons/unknown.svg?url";
import adaIcon from "@/assets/token-icons/ada.svg?url";

export type TokenInfoDto = {
  tokenID: number;
  label: string;
  icon: string;
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
  /** Resolved URL for `<img src>` (bundled asset or remote iconUrl). */
  icon: string;
};

const ICON_BY_KEY: Record<string, string> = {
  apex: apexIcon,
  eth: ethIcon,
  polygon: polygonIcon,
  sei: seiIcon,
  solana: solanaIcon,
  ada: adaIcon,
  unknown: unknownIcon,
};

const DEFAULT_UNKNOWN: TokenInfoDto = {
  tokenID: 0,
  label: "",
  icon: "unknown",
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
  // Only fill gaps until /tokenInfo loads — do not overwrite API metadata.
  for (const t of tokens) {
    if (byId.has(t.id)) continue;
    byId.set(t.id, {
      tokenID: t.id,
      label: t.name,
      icon: "unknown",
    });
  }
}

export function resolveTokenIconUrl(
  iconKey: string | undefined,
  iconUrl?: string,
): string {
  if (iconUrl) return iconUrl;
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  return ICON_BY_KEY.unknown;
}

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
