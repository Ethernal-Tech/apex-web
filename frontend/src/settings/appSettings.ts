export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _minUtxoValue: number = 0;
	private _minEvmValue: number = 0;
	private _primeVectorBridgingFee: number = 0;
	private _nexusBridgingFee: number = 0;
	private _potentialWalletFee: number = 0;
	private _usePrivateKey: boolean = false;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._minUtxoValue = settingsJson.minUtxoValue;
		this._minEvmValue = settingsJson.minEvmValue;
		this._primeVectorBridgingFee = settingsJson.primeVectorBridgingFee;
		this._nexusBridgingFee = settingsJson.nexusBridgingFee;
		this._potentialWalletFee = settingsJson.potentialWalletFee;
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

	get primeVectorBridgingFee(): number {
		return this._primeVectorBridgingFee;
	}
	
	get nexusBridgingFee(): number {
		return this._nexusBridgingFee;
	}

	get potentialWalletFee(): number {
		return this._potentialWalletFee;
	}

	get usePrivateKey(): boolean {
		return this._usePrivateKey;
	}
}

const appSettings = new AppSettings();
export default appSettings;