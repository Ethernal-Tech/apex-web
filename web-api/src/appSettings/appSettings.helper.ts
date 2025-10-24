import * as fs from 'fs';
import path from 'path';
import { AppSettings, DeepPartial, LogLevel } from './appSettings.interface';
import { bool, cleanEnv, makeValidator, num, str } from 'envalid';

export const resolveConfigDir = (): string => {
	const candidates = [
		path.resolve(process.cwd(), 'dist', 'config'),
		path.resolve(process.cwd(), 'src', 'appSettings', 'settings'),
		path.resolve(__dirname, '../config'),
		path.resolve(__dirname, '../../config'),
	];
	const hit = candidates.find((p) =>
		fs.existsSync(path.join(p, 'settings.json')),
	);
	if (!hit) {
		throw new Error(
			`Config folder not found. Looked in: ${candidates.join(' , ')}. ` +
				`Ensure nest-cli.json copies appSettings/settings/*.json to dist.`,
		);
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

export const envOverrides = (): DeepPartial<AppSettings> => {
	const env = cleanEnv(process.env, {
		APP_NAME: str({ default: undefined }),
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

		ORACLE_URL: str({ default: undefined }),
		CARDANO_API_URL: str({ default: undefined }),
		CENTRALIZED_API_URL: str({ default: undefined }),

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
	});

	return {
		app: {
			name: env.APP_NAME,
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
			oracleUrl: env.ORACLE_URL,
			cardanoApiUrl: env.CARDANO_API_URL,
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
	};
};
