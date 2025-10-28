// src/config/app-config.singleton.ts

import { AppConfigService as AppConfigService } from './appConfig.service';

let appSettings: AppConfigService | null = null;

export function getAppSettings(): AppConfigService {
	if (!appSettings) appSettings = new AppConfigService();
	return appSettings;
}
