import appSettings from '../settings/appSettings';
import { getToken } from '../utils/storageUtils';

export abstract class BaseClient {
    protected async transformOptions(originalOptions: RequestInit): Promise<RequestInit> {
		const accessToken = getToken()?.token;

        return Promise.resolve({
			...originalOptions,
			headers: {
				...originalOptions.headers,
				"Authorization": `Bearer ${accessToken}`
			},
        });
	}

	protected getBaseUrl(defaultUrl: string, baseUrl?: string): string {
		return appSettings.apiUrl;
    }
}
