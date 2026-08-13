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
	 * Key of the icon asset bundled in the frontend (apex, eth, polygon, sei,
	 * solana, unknown). An unrecognized key is expected to fall back to the
	 * unknown icon, so a new token can ship before its asset does.
	 */
	icon: string;
	/**
	 * Optional hosted image to use instead of the bundled asset. The escape
	 * hatch for a brand new token whose icon is not in the frontend yet.
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
		icon: 'unknown',
	},
	tokens: [],
};
