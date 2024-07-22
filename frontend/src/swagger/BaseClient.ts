import appSettings from '../settings/appSettings';

export abstract class BaseClient {
    protected async transformOptions(originalOptions: RequestInit): Promise<RequestInit> {

        return Promise.resolve(originalOptions);
	}

	protected getBaseUrl(defaultUrl: string, baseUrl?: string): string {
		return appSettings.apiUrl;
    }
}
