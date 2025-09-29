// src/config/app-config.service.ts
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
	features: { useCentralizedBridge: boolean };
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

// ✅ no `Function` type used
type AnyFn = (...args: unknown[]) => unknown;
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type DeepPartial<T> = T extends Primitive
	? T
	: T extends AnyFn
		? T // leave functions as-is
		: T extends readonly (infer U)[]
			? readonly DeepPartial<U>[] // readonly arrays
			: T extends (infer U)[]
				? DeepPartial<U>[] // mutable arrays
				: T extends object
					? { [K in keyof T]?: DeepPartial<T[K]> }
					: T;

// keep your defaults, but type them as DeepPartial
const DEFAULTS: Readonly<DeepPartial<AppSettings>> = {
	app: {
		port: 3500,
	},
	bridge: {
		recentInputsThresholdMinutes: 5,
	},
	services: {
		oracleUrl: 'http://localhost:40000',
		cardanoApiUrl: 'http://localhost:40000',
	},
	database: {
		port: 5432,
	},
	email: {
		contactEmail: 'info@ethernal.tech',
		smtpPort: 465,
	},
};

function deepMerge<T>(
	base: DeepPartial<T>,
	override: DeepPartial<T>,
): DeepPartial<T> {
	const out: any = Array.isArray(base)
		? [...(base as any)]
		: { ...(base as any) };
	for (const [k, v] of Object.entries(override ?? {})) {
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			out[k] = deepMerge(out[k] ?? {}, v as any);
		} else {
			out[k] = v;
		}
	}
	return out;
}

function resolveConfigDir(): string {
	const candidates = [
		path.resolve(process.cwd(), 'dist', 'config'), // prod after build
		path.resolve(process.cwd(), 'src/appSettings/settings'), // dev
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
}

@Injectable()
export class AppSettingsService {
	private readonly settings: AppSettings;

	constructor() {
		const settingsDir = resolveConfigDir();

		const commonPath = path.join(settingsDir, 'settings.json');

		const envName = (process.env.NODE_ENV ?? '').toLowerCase().trim();

		const settingsPath = envName ? `settings.${envName}.json` : commonPath;

		const common = JSON.parse(
			fs.readFileSync(settingsPath, 'utf8'),
		) as DeepPartial<AppSettings>;
		const perEnv = fs.existsSync(settingsPath)
			? (JSON.parse(
					fs.readFileSync(settingsPath, 'utf8'),
				) as DeepPartial<AppSettings>)
			: {};

		// DEFAULTS -> common -> perEnv
		const merged = deepMerge<AppSettings>(
			deepMerge<AppSettings>(DEFAULTS, common),
			perEnv,
		) as AppSettings;

		this.settings = merged;
	}

	get all(): AppSettings {
		return this.settings;
	}

	// Convenience getters
	get port() {
		return this.settings.app.port;
	}
	get corsAllowList() {
		return this.settings.app.corsAllowList;
	}
	get logLevel() {
		return this.settings.app.logLevel;
	}

	get app() {
		return this.settings.app;
	}

	get bridge() {
		return this.settings.bridge;
	}

	get features() {
		return this.settings.features;
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
