// src/config/app-config.singleton.ts

import { AppSettingsService } from './appSettings.service';

let appSettings: AppSettingsService | null = null;

export function getAppSettings(): AppSettingsService {
	if (!appSettings) appSettings = new AppSettingsService();
	return appSettings;
}
