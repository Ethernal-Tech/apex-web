export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _minUtxoValue: number = 0;
	private _minEvmValue: number = 0;
	private _bridgingFee: number = 0;
	private _evmBridgingFee: number = 0;
	private _usePrivateKey: boolean = false;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._minUtxoValue = settingsJson.minUtxoValue;
		this._minEvmValue = settingsJson.minEvmValue;
		this._bridgingFee = settingsJson.bridgingFee;
		this._evmBridgingFee = settingsJson.evmBridgingFee;
		this._usePrivateKey = settingsJson.usePrivateKey;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get minUtxoValue(): number {
		return this._minUtxoValue;
	}
	
	get minEvmValue(): number {
		return this._minEvmValue;
	}

	get bridgingFee(): number {
		return this._bridgingFee;
	}
	
	get evmBridgingFee(): number {
		return this._evmBridgingFee;
	}

	get usePrivateKey(): boolean {
		return this._usePrivateKey;
	}
}

const appSettings = new AppSettings();
export default appSettings;