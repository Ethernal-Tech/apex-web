/**
 * Price source. Add a value here (and a provider class implementing
 * TokenPriceProvider) when plugging in a new price API.
 */
export enum PriceProviderEnum {
	CoinGecko = 'coingecko',
	DefiLlama = 'defillama',
}

/**
 * A token whose USD price is periodically fetched and cached.
 * To start tracking a new token, append an entry to the matching
 * trackedTokens.<network>.json file (see TrackedTokensRegistry) - the cron
 * job, the cache and the endpoint pick it up on the next refresh, without a
 * rebuild or a restart.
 */
export interface TrackedToken {
	/**
	 * Cache key, uppercase, unique across the registry. Also matched against the
	 * ecosystem token names from the bridge settings to find the tokenIDs this
	 * price applies to.
	 */
	symbol: string;
	/**
	 * Further ecosystem names of the same asset, for when the bridge names it
	 * differently than the price providers do (e.g. symbol APEX, alias AP3X).
	 * Only one representation needs to match - the wrapped ones are derived.
	 */
	aliases?: string[];
	/**
	 * Escape hatch: internal token IDs to force onto this price, on top of the
	 * ones derived from the bridge settings. Only needed for assets the
	 * direction config does not connect to a named ecosystem token.
	 */
	tokenIDs?: number[];
	/**
	 * Identifier of this token per provider. Leave a provider out to make that
	 * provider skip the token (e.g. a token DefiLlama does not index).
	 */
	ids: Partial<Record<PriceProviderEnum, string>>;
}

/** Catalog of every token the fallback knows how to price. */
const TRACKED_TOKEN_CATALOG = {
	APEX: {
		symbol: 'APEX',
		aliases: ['AP3X'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'apex-4',
			[PriceProviderEnum.DefiLlama]: 'coingecko:apex-4',
		},
	},
	ADA: {
		symbol: 'ADA',
		aliases: ['WADA'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'cardano',
			[PriceProviderEnum.DefiLlama]: 'coingecko:cardano',
		},
	},
	SOL: {
		symbol: 'SOL',
		aliases: ['WSOL'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'solana',
			[PriceProviderEnum.DefiLlama]: 'coingecko:solana',
		},
	},
	POL: {
		symbol: 'POL',
		aliases: ['WPOL', 'MATIC'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'polygon-ecosystem-token',
			[PriceProviderEnum.DefiLlama]: 'coingecko:polygon-ecosystem-token',
		},
	},
	ETH: {
		symbol: 'ETH',
		aliases: ['WETH'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'ethereum',
			[PriceProviderEnum.DefiLlama]: 'coingecko:ethereum',
		},
	},
	SEI: {
		symbol: 'SEI',
		aliases: ['WSEI'],
		ids: {
			[PriceProviderEnum.CoinGecko]: 'sei-network',
			[PriceProviderEnum.DefiLlama]: 'coingecko:sei-network',
		},
	},
} as const satisfies Record<string, TrackedToken>;

type TrackedTokenSymbol = keyof typeof TRACKED_TOKEN_CATALOG;

/** Keep in sync with trackedTokens.mainnet.json. */
const MAINNET_TRACKED_TOKEN_KEYS: readonly TrackedTokenSymbol[] = [
	'APEX',
	'ADA',
	'POL',
	'ETH',
];

/** Keep in sync with trackedTokens.testnet.json. */
const TESTNET_TRACKED_TOKEN_KEYS: readonly TrackedTokenSymbol[] = [
	'APEX',
	'ADA',
	'SOL',
	'POL',
	'ETH',
	'SEI',
];

const tokensFor = (
	keys: readonly TrackedTokenSymbol[],
): readonly TrackedToken[] => keys.map((key) => TRACKED_TOKEN_CATALOG[key]);

/**
 * Fallback when the network's trackedTokens.<network>.json cannot be read.
 */
export const defaultTrackedTokens = (
	isMainnet: boolean,
): readonly TrackedToken[] =>
	tokensFor(
		isMainnet ? MAINNET_TRACKED_TOKEN_KEYS : TESTNET_TRACKED_TOKEN_KEYS,
	);

/** Order in which providers are tried. Overridable via TOKEN_PRICE_PROVIDERS. */
export const DEFAULT_PROVIDER_ORDER: PriceProviderEnum[] = [
	PriceProviderEnum.CoinGecko,
	PriceProviderEnum.DefiLlama,
];
