export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _bridgingFee: number = 0;
	private _usePrivateKey: boolean = false;
	private _useFallbackBridge: boolean = false;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._bridgingFee = settingsJson.bridgingFee;
		this._usePrivateKey = settingsJson.usePrivateKey;
		this._useFallbackBridge = settingsJson.useFallbackBridge;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get bridgingFee(): number {
		return this._bridgingFee;
	}

	get usePrivateKey(): boolean {
		return this._usePrivateKey;
	}
	
	get useFallbackBridge(): boolean {
		return this._useFallbackBridge;
	}
}

const appSettings = new AppSettings();
export default appSettings;