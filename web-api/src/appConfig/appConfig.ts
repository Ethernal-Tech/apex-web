import { AppConfigService as AppConfigService } from './appConfig.service';

let appConfig: AppConfigService | null = null;

export function getAppConfig(): AppConfigService {
	if (!appConfig) appConfig = new AppConfigService();

	return appConfig;
}
