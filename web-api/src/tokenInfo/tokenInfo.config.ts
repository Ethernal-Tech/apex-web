/**
 * How a token is presented in the UI. Purely cosmetic - the bridging config
 * (which token can go where, its chain specific id, ...) stays in the settings
 * endpoint. To add a token, append an entry to the tokenInfos file of this
 * network (see TokenInfosRegistry); no rebuild, no redeploy, no restart.
 */
export interface TokenInfo {
	/** Bridge token ID this metadata belongs to, unique within the file. */
	tokenID: number;
	/** Short name shown next to the amount, e.g. AP3X. */
	label: string;
	/**
	 * File name of an icon this API serves under /icons/tokens/, so "apex.svg" is
	 * loaded from <apiUrl>/icons/tokens/apex.svg. Updating an icon is an overwrite
	 * of that file; browsers revalidate hourly, and a query appended here
	 * ("apex.svg?v=2") forces it through sooner. A name with no file behind it
	 * falls back to the UI's bundled unknown icon, so a new token can ship before
	 * its icon does.
	 */
	icon: string;
	/**
	 * Optional absolute URL of an icon hosted elsewhere, loaded directly by the
	 * browser. Wins over "icon". Must point straight at an image - a GitHub
	 * /blob/ link serves HTML and will not render.
	 */
	iconUrl?: string;
	/**
	 * Accent color the UI paints this token in - legend dots, chart series - as
	 * a hex string (#RGB, #RRGGBB, optionally with alpha). Optional: a token
	 * without one is drawn in the UI's own default accent.
	 */
	color?: string;
}

export interface TokenInfosConfig {
	/** Served for any token ID missing from the list. */
	unknownToken: TokenInfo;
	tokens: TokenInfo[];
}

/**
 * Used only when no tokenInfos file can be read at all. Deliberately holds no
 * tokens - the JSON file is the single source of truth, and an empty list makes
 * a missing/unmounted config obvious instead of silently serving stale labels.
 */
export const DEFAULT_TOKEN_INFOS: TokenInfosConfig = {
	unknownToken: {
		tokenID: 0,
		label: '',
		icon: 'unknown.svg',
	},
	tokens: [],
};
