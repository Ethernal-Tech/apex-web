/**
 * How a chain is presented in the UI. Purely cosmetic - which chains the bridge
 * actually serves stays in the settings endpoint (enabledChains). To recolor or
 * rename a chain, or to give it a different logo, edit the chainInfos file of
 * this network (see ChainInfosRegistry); no rebuild, no redeploy, no restart.
 */

/**
 * Chain family the UI groups a chain under - it picks the audit page's tab and
 * the bridge's network filter. "apex" is accepted but no chain uses it: Apex
 * Fusion membership is the separate apexFusion flag, since a Fusion chain is
 * also a utxo or evm one.
 */
export const CHAIN_CATEGORIES = ['apex', 'utxo', 'evm', 'svm'] as const;

export type ChainCategory = (typeof CHAIN_CATEGORIES)[number];

export interface ChainInfo {
	/** Chain id as the rest of the API spells it: prime, cardano, nexus, ... */
	chain: string;
	/**
	 * Accent color the UI paints the chain in - donut and bar segments, chain
	 * labels - as a hex string (#RGB, #RRGGBB, optionally with alpha).
	 */
	color: string;
	/**
	 * Name the UI shows for the chain. Optional: without it the UI capitalizes
	 * the chain id, so "unichain" reads as "Unichain".
	 */
	label?: string;
	/**
	 * File name of a logo this API serves under /icons/chains/, so "prime.svg" is
	 * loaded from <apiUrl>/icons/chains/prime.svg. Updating a logo is an overwrite
	 * of that file; browsers revalidate hourly, and a query appended here
	 * ("prime.svg?v=2") forces it through sooner. A name with no file behind it
	 * falls back to the UI's bundled unknown logo.
	 */
	icon?: string;
	/**
	 * Absolute URL of a logo hosted elsewhere, which the browser loads directly.
	 * Wins over "icon". Must point straight at an image - a GitHub /blob/ link
	 * serves HTML and will not render.
	 */
	iconUrl?: string;
	/**
	 * Where the chain sits in every chain list the UI draws - the bridge
	 * pickers, the audit breakdown. Lower comes first; chains without one sort
	 * last, in the order the file lists them.
	 */
	order?: number;
	/** Chain family, see CHAIN_CATEGORIES. Defaults to "evm" in the UI. */
	category?: ChainCategory;
	/** Ticker of the chain's native currency, shown next to amounts. */
	symbol?: string;
	/** True for an Apex Fusion chain, which the UI can filter on. */
	apexFusion?: boolean;
}

export interface ChainInfosConfig {
	/**
	 * Served for a chain that is not in the list. Optional: without it the UI
	 * falls back to its own default accent.
	 */
	unknownChain?: ChainInfo;
	chains: ChainInfo[];
}

/**
 * Used only when no chainInfos file can be read at all. Deliberately holds no
 * chains - the JSON file is the single source of truth, and an empty list makes
 * a missing/unmounted config obvious instead of silently serving stale colors.
 */
export const DEFAULT_CHAIN_INFOS: ChainInfosConfig = {
	chains: [],
};
