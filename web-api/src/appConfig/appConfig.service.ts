import { Injectable } from '@nestjs/common';
import * as path from 'path';
import mergeWith from 'lodash.merge';
import { AppConfig, DeepPartial } from './appConfig.interface';
import {
	envOverrides,
	resolveConfigDir,
	safeReadJson,
} from './appConfig.helper';

const DEFAULTS: Readonly<DeepPartial<AppConfig>> = {
	app: { port: 3500, isMainnet: false },
	bridge: { recentInputsThresholdMinutes: 5 },
	services: {
		oracleUrl: 'http://localhost:40000',
		cardanoApiUrl: 'http://localhost:40000',
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
		const dir = resolveConfigDir();
		const envName = (process.env.NODE_ENV ?? '').toLowerCase().trim();

		const common = safeReadJson<AppConfig>(path.join(dir, 'config.json'));
		const perEnv = safeReadJson<AppConfig>(
			envName ? path.join(dir, `config.${envName}.json`) : undefined,
		);

		// DEFAULTS -> common -> perEnv -> ENV, with arrays replaced by later sources
		const merged = mergeWith(
			{},
			DEFAULTS,
			common,
			perEnv,
			envOverrides(),
		) as AppConfig;

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
	get oracleUrl() {
		return this.config.services.oracleUrl;
	}
	get cardanoApiUrl() {
		return this.config.services.cardanoApiUrl;
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
}
