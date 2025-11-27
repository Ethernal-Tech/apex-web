import * as fs from 'fs';
import path from 'path';
import { AppConfig, DeepPartial, LogLevel } from './appConfig.interface';
import { bool, cleanEnv, makeValidator, num, str } from 'envalid';
import { Logger } from '@nestjs/common';

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

export const envOverrides = (): DeepPartial<AppConfig> => {
	const env = cleanEnv(process.env, {
		LOG_LEVEL: str({ default: undefined }),
		PORT: num({ default: undefined }),
		CORS_ALLOW_LIST: list({
			default: undefined,
		}),
		IS_MAINNET: bool({ default: undefined }),

		USE_CENTRALIZED_BRIDGE: bool({ default: undefined }),
		STATUS_UPDATE_MODES_SUPPORTED: list({ default: undefined }),

		ETH_TX_TTL_INC: num({ default: undefined }),
		RECENT_INPUTS_THRESHOLD_MINUTES: num({ default: undefined }),
		NEXUS_BRIDGING_ADDR: str({ default: undefined }),
		NEXUS_CENTRALIZED_BRIDGING_ADDR: str({ default: undefined }),

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
	});

	return {
		app: {
			logLevel: env.LOG_LEVEL as LogLevel,
			port: env.PORT,
			corsAllowList: env.CORS_ALLOW_LIST,
			isMainnet: env.IS_MAINNET,
		},
		features: {
			useCentralizedBridge: env.USE_CENTRALIZED_BRIDGE,
			statusUpdateModesSupported: env.STATUS_UPDATE_MODES_SUPPORTED,
		},
		bridge: {
			ethTxTtlInc: env.ETH_TX_TTL_INC,
			recentInputsThresholdMinutes: env.RECENT_INPUTS_THRESHOLD_MINUTES,
			addresses: {
				nexusBridging: env.NEXUS_BRIDGING_ADDR as `0x${string}`,
				nexusCentralizedBridging:
					env.NEXUS_CENTRALIZED_BRIDGING_ADDR as `0x${string}`,
			},
		},
		services: {
			oracleSkylineUrl: env.ORACLE_SKYLINE_URL,
			oracleReactorUrl: env.ORACLE_REACTOR_URL,
			cardanoApiSkylineUrl: env.CARDANO_API_SKYLINE_URL,
			cardanoApiReactorUrl: env.CARDANO_API_REACTOR_URL,
			centralizedApiUrl: env.CENTRALIZED_API_URL,
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
	};
};
