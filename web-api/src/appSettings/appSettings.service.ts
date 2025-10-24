import { Injectable } from '@nestjs/common';
import * as path from 'path';
import mergeWith from 'lodash.merge';
import { AppSettings, DeepPartial } from './appSettings.interface';
import {
	envOverrides,
	resolveConfigDir,
	safeReadJson,
} from './appSettings.helper';

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

		// DEFAULTS -> common -> perEnv -> ENV, with arrays replaced by later sources
		const merged = mergeWith(
			{},
			DEFAULTS,
			common,
			perEnv,
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
