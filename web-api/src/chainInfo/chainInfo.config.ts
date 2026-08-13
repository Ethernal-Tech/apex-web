/**
 * How a chain is presented in the UI. Purely cosmetic - which chains the bridge
 * actually serves stays in the settings endpoint (enabledChains). To recolor a
 * chain, edit the chainInfos file of this network (see ChainInfosRegistry); no
 * rebuild, no redeploy, no restart.
 */
export interface ChainInfo {
	/** Chain id as the rest of the API spells it: prime, cardano, nexus, ... */
	chain: string;
	/**
	 * Accent color the UI paints the chain in - donut and bar segments, chain
	 * labels - as a hex string (#RGB, #RRGGBB, optionally with alpha).
	 */
	color: string;
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
