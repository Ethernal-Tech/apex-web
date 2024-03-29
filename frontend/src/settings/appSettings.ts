export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}
}

const appSettings = new AppSettings();
export default appSettings;