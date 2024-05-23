export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _bridgingFee: number = 0;
	private _usePrivateKey: boolean = false;
	private _primeAddress: string = '';
	private _primePrivateKey: string = '';
	private _vectorAddress: string = '';
	private _vectorPrivateKey: string = '';

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._bridgingFee = settingsJson.bridgingFee;
		this._usePrivateKey = settingsJson.usePrivateKey;
		this._primeAddress = settingsJson.primeAddress;
		this._primePrivateKey = settingsJson.primePrivateKey;
		this._vectorAddress = settingsJson.vectorAddress;
		this._vectorPrivateKey = settingsJson.vectorPrivateKey;
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

	get primeAddress(): string {
		return this._primeAddress;
	}

	get primePrivateKey(): string {
		return this._primePrivateKey;
	}

	get vectorAddress(): string {
		return this._vectorAddress;
	}

	get vectorPrivateKey(): string {
		return this._vectorPrivateKey;
	}
}

const appSettings = new AppSettings();
export default appSettings;