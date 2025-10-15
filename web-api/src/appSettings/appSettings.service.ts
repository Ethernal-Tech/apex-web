import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type LogLevel =
	| 'emerg'
	| 'alert'
	| 'crit'
	| 'error'
	| 'warning'
	| 'notice'
	| 'info'
	| 'debug';

export interface AppSettings {
	app: {
		name: string;
		logLevel: LogLevel;
		port: number;
		corsAllowList: string[];
		isMainnet: boolean;
	};
	features: {
		useCentralizedBridge: boolean;
		statusUpdateModesSupported: string[];
	};
	bridge: {
		ethTxTtlInc: number;
		recentInputsThresholdMinutes: number;
		addresses: {
			nexusBridging: `0x${string}`;
			nexusCentralizedBridging: `0x${string}`;
		};
	};
	services: {
		oracleUrl: string;
		cardanoApiUrl: string;
		centralizedApiUrl: string;
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
}

type AnyFn = (...args: unknown[]) => unknown;
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type DeepPartial<T> = T extends Primitive
	? T
	: T extends AnyFn
		? T
		: T extends readonly (infer U)[]
			? readonly DeepPartial<U>[]
			: T extends (infer U)[]
				? DeepPartial<U>[]
				: T extends object
					? { [K in keyof T]?: DeepPartial<T[K]> }
					: T;

const DEFAULTS: Readonly<DeepPartial<AppSettings>> = {
	app: { port: 3500 },
	bridge: { recentInputsThresholdMinutes: 5 },
	services: {
		oracleUrl: 'http://localhost:40000',
		cardanoApiUrl: 'http://localhost:40000',
	},
	database: { port: 5432 },
	email: { contactEmail: 'info@ethernal.tech', smtpPort: 465 },
	features: {
		statusUpdateModesSupported: [],
	},
};

const mergeDeep = <T>(
	a: DeepPartial<T> | undefined,
	b: DeepPartial<T> | undefined,
): DeepPartial<T> => {
	if (b === undefined) return a ?? ({} as DeepPartial<T>);
	if (a === undefined) return b;

	if (Array.isArray(a) && Array.isArray(b)) {
		return b as any;
	}

	if (a && typeof a === 'object' && b && typeof b === 'object') {
		const out: any = { ...(a as any) };
		for (const k of Object.keys(b as any)) {
			const av = (a as any)[k];
			const bv = (b as any)[k];
			out[k] = mergeDeep(av, bv);
		}
		return out;
	}

	return b ?? a;
};

const resolveConfigDir = (): string => {
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

function safeReadJson<T>(p?: string): DeepPartial<T> {
	if (!p || !fs.existsSync(p)) {
		return {} as DeepPartial<T>;
	}
	return JSON.parse(fs.readFileSync(p, 'utf8')) as DeepPartial<T>;
}

const has = (k: string) => Object.prototype.hasOwnProperty.call(process.env, k);
const raw = (k: string) => (has(k) ? String(process.env[k]) : undefined);

const parsers = {
	str: (k: string) => raw(k),
	num: (k: string) => {
		const v = raw(k);
		if (v === undefined || v === '') return undefined;
		const n = Number(v);
		return Number.isNaN(n) ? undefined : n;
	},
	bool: (k: string) => {
		const v = raw(k)?.trim().toLowerCase();
		if (v === undefined) return undefined;
		if (['1', 'true', 'yes', 'on'].includes(v)) return true;
		if (['0', 'false', 'no', 'off'].includes(v)) return false;
		return undefined;
	},
	list: (k: string, sep = ',') => {
		const v = raw(k);
		return v
			? v
					.split(sep)
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined;
	},
} as const;

type ParserKind = keyof typeof parsers;

const setPath = (obj: any, dottedPath: string, value: unknown) => {
	if (value === undefined) return;
	const parts = dottedPath.split('.');
	let cur = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		cur[parts[i]] ??= {};
		cur = cur[parts[i]];
	}
	cur[parts[parts.length - 1]] = value;
};

/** Map of settings paths to [ENV_VAR, parser] */
const ENV_MAP: Array<[path: string, env: string, parser: ParserKind]> = [
	['app.name', 'APP_NAME', 'str'],
	['app.logLevel', 'LOG_LEVEL', 'str'],
	['app.port', 'PORT', 'num'],
	['app.corsAllowList', 'CORS_ALLOW_LIST', 'list'],
	['app.isMainnet', 'IS_MAINNET', 'bool'],

	['features.useCentralizedBridge', 'USE_CENTRALIZED_BRIDGE', 'bool'],
	[
		'features.statusUpdateModesSupported',
		'STATUS_UPDATE_MODES_SUPPORTED',
		'list',
	],

	['bridge.ethTxTtlInc', 'ETH_TX_TTL_INC', 'num'],
	[
		'bridge.recentInputsThresholdMinutes',
		'RECENT_INPUTS_THRESHOLD_MINUTES',
		'num',
	],
	['bridge.addresses.nexusBridging', 'NEXUS_BRIDGING_ADDR', 'str'],
	[
		'bridge.addresses.nexusCentralizedBridging',
		'NEXUS_CENTRALIZED_BRIDGING_ADDR',
		'str',
	],

	['services.oracleUrl', 'ORACLE_URL', 'str'],
	['services.cardanoApiUrl', 'CARDANO_API_URL', 'str'],
	['services.centralizedApiUrl', 'CENTRALIZED_API_URL', 'str'],

	['database.host', 'DB_HOST', 'str'],
	['database.port', 'DB_PORT', 'num'],
	['database.name', 'DB_NAME', 'str'],
	['database.ssl', 'DB_SSL', 'bool'],
	['database.migrationsTableName', 'DB_MIGRATIONS_TABLE_NAME', 'str'],
	['database.entities', 'DB_ENTITIES', 'list'],
	['database.migrations', 'DB_MIGRATIONS', 'list'],

	['email.contactEmail', 'CONTACT_EMAIL', 'str'],
	['email.smtpHost', 'SMTP_HOST', 'str'],
	['email.smtpPort', 'SMTP_PORT', 'num'],
];

const envOverrides = (): DeepPartial<AppSettings> => {
	const out: any = {};
	for (const [p, k, kind] of ENV_MAP) {
		const parse = parsers[kind] as (key: string) => unknown;
		const v = parse(k);
		if (v !== undefined) setPath(out, p, v);
	}
	return out as DeepPartial<AppSettings>;
};

@Injectable()
export class AppSettingsService {
	private readonly settings: AppSettings;

	constructor() {
		const dir = resolveConfigDir();
		const envName = (process.env.NODE_ENV ?? '').toLowerCase().trim();

		const common = safeReadJson<AppSettings>(path.join(dir, 'settings.json'));
		const perEnv = safeReadJson<AppSettings>(
			envName ? path.join(dir, `settings.${envName}.json`) : undefined,
		);

		// DEFAULTS -> common -> perEnv -> ENV
		const jsonMerged = mergeDeep<AppSettings>(
			mergeDeep<AppSettings>(DEFAULTS, common),
			perEnv,
		);
		const merged = mergeDeep<AppSettings>(
			jsonMerged,
			envOverrides(),
		) as AppSettings;

		this.settings = merged;
	}

	get all(): AppSettings {
		return this.settings;
	}
	get app() {
		return this.settings.app;
	}
	get port() {
		return this.settings.app.port;
	}
	get corsAllowList() {
		return this.settings.app.corsAllowList;
	}
	get logLevel() {
		return this.settings.app.logLevel;
	}
	get features() {
		return this.settings.features;
	}
	get statusUpdateModesSupported() {
		return this.settings.features.statusUpdateModesSupported;
	}
	get bridge() {
		return this.settings.bridge;
	}
	get oracleUrl() {
		return this.settings.services.oracleUrl;
	}
	get cardanoApiUrl() {
		return this.settings.services.cardanoApiUrl;
	}
	get centralizedApiUrl() {
		return this.settings.services.centralizedApiUrl;
	}
	get db() {
		return this.settings.database;
	}
	get email() {
		return this.settings.email;
	}
}
