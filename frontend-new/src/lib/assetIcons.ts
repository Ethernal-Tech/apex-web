import unknownIcon from "@/assets/token-icons/unknown.svg?url";
import appSettings from "@/settings/appSettings";

/**
 * The one logo still bundled with the app, deliberately.
 *
 * Every chain and token logo is served by the web-api under /icons (see the
 * chainInfos and tokenInfos configs), so a new chain or token needs no frontend
 * change. This one stays bundled because it is what the UI draws when that is
 * not possible: before the config has loaded, for an entry the config does not
 * name, and from the AssetIcon onError handler when a logo fails to load. A
 * fallback fetched over the same connection that just failed would be no
 * fallback at all.
 */
export const UNKNOWN_ICON_URL: string = unknownIcon;

/** Where the web-api serves the logos the configs name, per kind. */
const ICON_PATHS = {
  chain: "icons/chains/",
  token: "icons/tokens/",
} as const;

/**
 * Absolute URL for a logo the config named by file name.
 *
 * `iconUrl` is an absolute URL that overrides `icon`, for a logo hosted
 * somewhere other than the web-api. Neither set - or an entry the config does
 * not name at all - falls back to the bundled unknown logo.
 */
export function resolveAssetIconUrl(
  kind: keyof typeof ICON_PATHS,
  icon: string | undefined,
  iconUrl?: string,
): string {
  if (iconUrl) return iconUrl;
  if (!icon) return UNKNOWN_ICON_URL;

  // apiUrl is baked in at build time and carries no trailing slash
  return `${appSettings.apiUrl}/${ICON_PATHS[kind]}${icon}`;
}
