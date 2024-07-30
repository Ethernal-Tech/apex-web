export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _minUtxoValue: number = 0;
	private _bridgingFee: number = 0;
	private _usePrivateKey: boolean = false;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		// TODO - add minEvmValue, and minEvmBridgingFee. And conditional rendering for use
		this._minUtxoValue = settingsJson.minUtxoValue;
		this._bridgingFee = settingsJson.bridgingFee;
		this._usePrivateKey = settingsJson.usePrivateKey;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get minUtxoValue(): number {
		return this._minUtxoValue;
	}

	get bridgingFee(): number {
		return this._bridgingFee;
	}

	get usePrivateKey(): boolean {
		return this._usePrivateKey;
	}
}

const appSettings = new AppSettings();
export default appSettings;