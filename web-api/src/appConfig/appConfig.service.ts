import { Injectable } from '@nestjs/common';
import * as path from 'path';
import mergeWith from 'lodash.merge';
import { AppConfig, DeepPartial } from './appConfig.interface';
import {
	envOverrides,
	resolveConfigDir,
	safeReadJson,
} from './appConfig.helper';

const defaultUrl = 'http://localhost:40000';

const DEFAULTS: Readonly<DeepPartial<AppConfig>> = {
	app: { port: 3500, isMainnet: false },
	bridge: { recentInputsThresholdMinutes: 5, ethTxTtlInc: 50 },
	services: {
		oracleSkylineUrl: defaultUrl,
		oracleReactorUrl: defaultUrl,
		cardanoApiSkylineUrl: defaultUrl,
		cardanoApiReactorUrl: defaultUrl,
	},
	database: {
		port: 5432,
		name: 'apex',
		migrations: ['dist/database/migrations/*.js'],
		migrationsTableName: '__apex_migrations',
		entities: ['dist/**/*.entity.js'],
	},
	email: { contactEmail: 'info@ethernal.tech', smtpPort: 465 },
	features: {
		statusUpdateModesSupported: [],
	},
};

@Injectable()
export class AppConfigService {
	private readonly config: AppConfig;

	constructor() {
		const envName = (process.env.NODE_ENV ?? '').toLowerCase().trim();
		const fileName = envName ? `config.${envName}.json` : 'config.json';

		const dir = resolveConfigDir(fileName);

		const common = safeReadJson<AppConfig>(path.join(dir, fileName));

		// DEFAULTS -> common -> perEnv -> ENV, with arrays replaced by later sources
		const merged = mergeWith({}, DEFAULTS, common, envOverrides()) as AppConfig;

		this.config = merged;
	}

	get all(): AppConfig {
		return this.config;
	}
	get app() {
		return this.config.app;
	}
	get port() {
		return this.config.app.port;
	}
	get corsAllowList() {
		return this.config.app.corsAllowList;
	}
	get logLevel() {
		return this.config.app.logLevel;
	}
	get features() {
		return this.config.features;
	}
	get statusUpdateModesSupported() {
		return this.config.features.statusUpdateModesSupported;
	}
	get bridge() {
		return this.config.bridge;
	}
	get oracleSkylineUrl() {
		return this.config.services.oracleSkylineUrl;
	}
	get oracleReactorUrl() {
		return this.config.services.oracleReactorUrl;
	}
	get cardanoSkylineApiUrl() {
		return this.config.services.cardanoApiSkylineUrl;
	}
	get cardanoReactorApiUrl() {
		return this.config.services.cardanoApiReactorUrl;
	}
	get centralizedApiUrl() {
		return this.config.services.centralizedApiUrl;
	}
	get db() {
		return this.config.database;
	}
	get email() {
		return this.config.email;
	}
	get layerZero() {
		return this.config.layerzero;
	}
	get secrets() {
		return this.config.secrets;
	}
}
