import appSettings from '../settings/appSettings';

export abstract class BaseClient {
    protected async transformOptions(originalOptions: RequestInit): Promise<RequestInit> {
		// TODO: add accessToken
		const accessToken = ''

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
