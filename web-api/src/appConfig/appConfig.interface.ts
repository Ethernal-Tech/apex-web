export type LogLevel =
	| 'emerg'
	| 'alert'
	| 'crit'
	| 'error'
	| 'warning'
	| 'notice'
	| 'info'
	| 'debug';

export interface LayerZeroNetworkConfig {
	chain: string;
	oftAddress: `0x${string}`;
	chainID: number;
	txType: string;
}

export interface EvmAddressConfig {
	chain: string;
	address: `0x${string}`;
}

/** `chain::value` pair, for per-chain config whose value is not an EVM address. */
export interface ChainValueConfig {
	chain: string;
	value: string;
}

export interface AppConfig {
	app: {
		logLevel: LogLevel;
		port: number;
		corsAllowList: string[];
		isMainnet: boolean;
		txValidityPeriod: number;
		hashSecret: string;
	};
	features: {
		useCentralizedBridge: boolean;
		statusUpdateModesSupported: string[];
	};
	bridge: {
		ethTxTtlInc: number;
		recentInputsThresholdMinutes: number;
		addresses: {
			/**
			 * Fallback only, for as long as the oracle build that serves EVM
			 * bridging addresses is not deployed. The addresses actually
			 * used are resolved at startup by settings/gatewayAddresses.helper.ts,
			 * which prefers cardano-api and drops to this. The native token wallet
			 * has no entry here at all - it is always read off the chain.
			 */
			skylineGateway: EvmAddressConfig[];
			reactorNexusGateway: `0x${string}`;
			reactorNexusCentralizedGateway: `0x${string}`;
		};
	};
	services: {
		oracleSkylineUrl: string;
		oracleReactorUrl: string;
		cardanoApiSkylineUrl: string;
		cardanoApiReactorUrl: string;
		centralizedApiUrl: string;
	};
	/** Node endpoints for reading balances off non-Cardano chains. */
	rpc: {
		/** `chain::url` per EVM chain. */
		evmUrls: ChainValueConfig[];
		solanaUrl: string;
		/**
		 * `chain::address` fallback for the account holding locked funds on a
		 * Solana-type chain, used while the oracle does not serve one.
		 */
		solanaHolders: ChainValueConfig[];
	};
	database: {
		host: string;
		port: number;
		name: string;
		ssl: boolean;
		migrationsTableName: string;
		entities: string[];
		migrations: string[];
	};
	email: {
		contactEmail: string;
		smtpHost: string;
		smtpPort: number;
	};
	layerzero: {
		apiUrl: string;
		scanUrl: string;
		networks: LayerZeroNetworkConfig[];
	};
	prices: {
		coingeckoApiUrl: string;
		coingeckoApiKey?: string;
		defillamaApiUrl: string;
		/** Providers are queried in this order, first hit per token wins. */
		providerOrder: string[];
		requestTimeoutMs: number;
		/** Age after which a cached price is reported as stale. */
		stalenessThresholdMinutes: number;
		/**
		 * Path to the tracked tokens JSON file. Defaults to trackedTokens.json in
		 * the appConfig config folder; point it at a mounted file to change the
		 * tracked tokens without rebuilding the image.
		 */
		trackedTokensPath?: string;
	};
	secrets: {
		apiKeys: string[];
	};
	/**
	 * Optional overrides for `GET /balance` (EVM / Solana only).
	 * Missing RPC URLs fall back to built-in defaults in BalanceService.
	 */
	balances?: {
		evmRpcUrls?: { [chain: string]: string };
		solanaRpcUrl?: string;
	};
}

export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;
