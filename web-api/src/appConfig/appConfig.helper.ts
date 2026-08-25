import * as fs from 'fs';
import path from 'path';
import {
	AppConfig,
	ChainValueConfig,
	DeepPartial,
	LogLevel,
} from './appConfig.interface';
import { bool, cleanEnv, makeValidator, num, str } from 'envalid';
import { Logger } from '@nestjs/common';
import { ChainApexBridgeEnum, ChainEnum } from 'src/common/enum';
import { isEvmChain } from 'src/utils/chainUtils';

export const resolveConfigDir = (configName: string): string => {
	const candidates = [
		path.resolve(process.cwd(), 'dist/src', 'appConfig', 'config'),
		path.resolve(process.cwd(), 'src', 'appConfig', 'config'),
		path.resolve(__dirname, '../config'),
		path.resolve(__dirname, '../../config'),
	];
	const hit = candidates.find((p) => fs.existsSync(path.join(p, configName)));
	if (!hit) {
		Logger.warn(
			`Config folder not found. Looked in: ${candidates.join(' , ')}. ` +
				`Ensure nest-cli.json copies appConfig/settings/*.json to dist.`,
		);
		return '';
	}

	return hit;
};

/** URL prefix the icon files are served under. */
export const ICONS_URL_PREFIX = '/icons/';

/**
 * Directory served at /icons - the chain and token logos the chainInfos and
 * tokenInfos configs name in their "icon" fields. Always public/icons, looked up
 * relative to the process working directory the way resolveConfigDir does, since
 * compiled __dirname is dist/src.
 */
export const resolveIconsDir = (): string => {
	const candidates = [
		path.resolve(process.cwd(), 'public', 'icons'),
		path.resolve(__dirname, '../../../public/icons'),
	];
	const hit = candidates.find((p) => fs.existsSync(p));
	if (!hit) {
		Logger.warn(
			`Icons folder not found. Looked in: ${candidates.join(' , ')}. ` +
				`Chain and token logos will 404 - ensure public/icons ships with the app.`,
		);
	}

	// still returned when missing, so the static handler simply 404s
	return hit ?? candidates[0];
};

export function safeReadJson<T>(p?: string): DeepPartial<T> {
	if (!p || !fs.existsSync(p)) {
		return {} as DeepPartial<T>;
	}
	return JSON.parse(fs.readFileSync(p, 'utf8')) as DeepPartial<T>;
}

export const list = makeValidator((x) => {
	if (!x) return []; // Handle empty string case
	return x
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
});

export const layerZeroConfig = makeValidator((x) => {
	if (!x) return [];

	return x
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((item) => {
			const parts = item.split('::');
			if (parts.length !== 4) {
				throw new Error(`Invalid LAYERZERO_CONFIG item format: "${item}"`);
			}
			const [chain, oftAddress, chainID, txType] = parts;
			return {
				chain,
				oftAddress: oftAddress as `0x${string}`,
				chainID: parseInt(chainID, 10),
				txType,
			};
		});
});

export const evmAddressConfig = makeValidator((x) => {
	if (!x) return [];

	return x
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((item) => {
			const parts = item.split('::');
			if (parts.length !== 2) {
				throw new Error(`Invalid evm address config item format: "${item}"`);
			}
			const [chain, address] = parts;
			return {
				chain,
				address: address as `0x${string}`,
			};
		});
});

/**
 * `chain::value,chain::value` - like evmAddressConfig
 */
export const chainValueConfig = makeValidator((x) => {
	if (!x) return [];

	return x
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((item) => {
			const separator = item.indexOf('::');
			if (separator <= 0 || separator === item.length - 2) {
				throw new Error(`Invalid chain::value config item format: "${item}"`);
			}
			return {
				chain: item.slice(0, separator),
				value: item.slice(separator + 2),
			};
		});
});

/**
 * `EVM_RPC_URL_<CHAIN>`, one variable per EVM chain rather than one packed list.
 *
 * The set of names is derived from the chains themselves, so adding an EVM chain
 * to ChainApexBridgeEnum is all it takes for its variable to be recognised.
 */
const EVM_RPC_URL_PREFIX = 'EVM_RPC_URL_';

const evmRpcChains = [
	...Object.values(ChainApexBridgeEnum).filter((chain) =>
		isEvmChain(chain as ChainEnum),
	),
	ChainEnum.Base,
	ChainEnum.BNB,
];

const evmRpcUrlVar = (chain: string): string =>
	`${EVM_RPC_URL_PREFIX}${chain.toUpperCase()}`;

const readEvmRpcUrls = (): ChainValueConfig[] => {
	const env = cleanEnv(
		process.env,
		Object.fromEntries(
			evmRpcChains.map((chain) => [
				evmRpcUrlVar(chain),
				str({ default: undefined }),
			]),
		),
	) as Record<string, string | undefined>;

	return evmRpcChains.flatMap((chain) => {
		const value = env[evmRpcUrlVar(chain)];

		return value ? [{ chain: chain as string, value }] : [];
	});
};

export const envOverrides = (): DeepPartial<AppConfig> => {
	if (process.env.EVM_RPC_URLS) {
		// Losing every EVM chain quietly because a deployment still carries only the
		// old packed variable is not a failure worth being subtle about.
		Logger.warn(
			`EVM_RPC_URLS is set but no longer read. Replace it with one ` +
				`${EVM_RPC_URL_PREFIX}<CHAIN> variable per chain, e.g. ` +
				`${evmRpcUrlVar(ChainApexBridgeEnum.Nexus)}.`,
		);
	}

	const env = cleanEnv(process.env, {
		LOG_LEVEL: str({ default: undefined }),
		PORT: num({ default: undefined }),
		CORS_ALLOW_LIST: list({
			default: undefined,
		}),
		IS_MAINNET: bool({ default: undefined }),
		TX_VALIDITY_PERIOD: num({ default: undefined }),
		HASH_SECRET: str({ default: undefined }),

		USE_CENTRALIZED_BRIDGE: bool({ default: undefined }),
		STATUS_UPDATE_MODES_SUPPORTED: list({ default: undefined }),

		ETH_TX_TTL_INC: num({ default: undefined }),
		RECENT_INPUTS_THRESHOLD_MINUTES: num({ default: undefined }),
		SKYLINE_GATEWAY_ADDRS: evmAddressConfig({ default: undefined }),
		REACTOR_NEXUS_GATEWAY_ADDR: str({ default: undefined }),
		REACTOR_NEXUS_CENTRALIZED_GATEWAY_ADDR: str({ default: undefined }),

		SOLANA_RPC_URL: str({ default: undefined }),
		SOLANA_HOLDER_ADDRS: chainValueConfig({ default: undefined }),

		CENTRALIZED_API_URL: str({ default: undefined }),
		ORACLE_SKYLINE_URL: str({ default: undefined }),
		ORACLE_REACTOR_URL: str({ default: undefined }),
		CARDANO_API_SKYLINE_URL: str({ default: undefined }),
		CARDANO_API_REACTOR_URL: str({ default: undefined }),

		DB_HOST: str({ default: undefined }),
		DB_PORT: num({ default: undefined }),
		DB_NAME: str({ default: undefined }),
		DB_SSL: bool({ default: undefined }),
		DB_MIGRATIONS_TABLE_NAME: str({ default: undefined }),
		DB_ENTITIES: list({ default: undefined }),
		DB_MIGRATIONS: list({ default: undefined }),

		CONTACT_EMAIL: str({ default: undefined }),
		SMTP_HOST: str({ default: undefined }),
		SMTP_PORT: num({ default: undefined }),

		LAYERZERO_API_URL: str({ default: undefined }),
		LAYERZERO_SCAN_URL: str({ default: undefined }),
		LAYERZERO_CONFIG: layerZeroConfig({ default: undefined }),

		COINGECKO_API_URL: str({ default: undefined }),
		COINGECKO_API_KEY: str({ default: undefined }),
		DEFILLAMA_API_URL: str({ default: undefined }),
		TOKEN_PRICE_PROVIDERS: list({ default: undefined }),
		TOKEN_PRICE_REQUEST_TIMEOUT_MS: num({ default: undefined }),
		TOKEN_PRICE_STALENESS_MINUTES: num({ default: undefined }),
		TRACKED_TOKENS_PATH: str({ default: undefined }),

		WEB_API_API_KEYS: list({ default: undefined }),
	});

	return {
		app: {
			logLevel: env.LOG_LEVEL as LogLevel,
			port: env.PORT,
			corsAllowList: env.CORS_ALLOW_LIST,
			isMainnet: env.IS_MAINNET,
			txValidityPeriod: env.TX_VALIDITY_PERIOD,
			hashSecret: env.HASH_SECRET,
		},
		features: {
			useCentralizedBridge: env.USE_CENTRALIZED_BRIDGE,
			statusUpdateModesSupported: env.STATUS_UPDATE_MODES_SUPPORTED,
		},
		bridge: {
			ethTxTtlInc: env.ETH_TX_TTL_INC,
			recentInputsThresholdMinutes: env.RECENT_INPUTS_THRESHOLD_MINUTES,
			addresses: {
				skylineGateway: env.SKYLINE_GATEWAY_ADDRS,
				reactorNexusGateway: env.REACTOR_NEXUS_GATEWAY_ADDR as `0x${string}`,
				reactorNexusCentralizedGateway:
					env.REACTOR_NEXUS_CENTRALIZED_GATEWAY_ADDR as `0x${string}`,
			},
		},
		services: {
			oracleSkylineUrl: env.ORACLE_SKYLINE_URL,
			oracleReactorUrl: env.ORACLE_REACTOR_URL,
			cardanoApiSkylineUrl: env.CARDANO_API_SKYLINE_URL,
			cardanoApiReactorUrl: env.CARDANO_API_REACTOR_URL,
			centralizedApiUrl: env.CENTRALIZED_API_URL,
		},
		rpc: {
			evmUrls: readEvmRpcUrls(),
			solanaUrl: env.SOLANA_RPC_URL,
			solanaHolders: env.SOLANA_HOLDER_ADDRS,
		},
		database: {
			host: env.DB_HOST,
			port: env.DB_PORT,
			name: env.DB_NAME,
			ssl: env.DB_SSL,
			migrationsTableName: env.DB_MIGRATIONS_TABLE_NAME,
			entities: env.DB_ENTITIES,
			migrations: env.DB_MIGRATIONS,
		},
		email: {
			contactEmail: env.CONTACT_EMAIL,
			smtpHost: env.SMTP_HOST,
			smtpPort: env.SMTP_PORT,
		},
		layerzero: {
			apiUrl: env.LAYERZERO_API_URL,
			scanUrl: env.LAYERZERO_SCAN_URL,
			networks: env.LAYERZERO_CONFIG,
		},
		prices: {
			coingeckoApiUrl: env.COINGECKO_API_URL,
			coingeckoApiKey: env.COINGECKO_API_KEY,
			defillamaApiUrl: env.DEFILLAMA_API_URL,
			providerOrder: env.TOKEN_PRICE_PROVIDERS,
			requestTimeoutMs: env.TOKEN_PRICE_REQUEST_TIMEOUT_MS,
			stalenessThresholdMinutes: env.TOKEN_PRICE_STALENESS_MINUTES,
			trackedTokensPath: env.TRACKED_TOKENS_PATH,
		},
		secrets: {
			apiKeys: env.WEB_API_API_KEYS,
		},
	};
};
