export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';
	private _minUtxoValue: string = '0';
	private _minEvmValue: string = '0';
	private _primeVectorBridgingFee: string = '0';
	private _nexusBridgingFee: string = '0';
	private _potentialWalletFee: number = 0;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._minUtxoValue = settingsJson.minUtxoValue;
		this._minEvmValue = settingsJson.minEvmValue;
		this._primeVectorBridgingFee = settingsJson.primeVectorBridgingFee;
		this._nexusBridgingFee = settingsJson.nexusBridgingFee;
		this._potentialWalletFee = settingsJson.potentialWalletFee;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get minUtxoValue(): string {
		return this._minUtxoValue;
	}
	
	get minEvmValue(): string {
		return this._minEvmValue;
	}

	get primeVectorBridgingFee(): string {
		return this._primeVectorBridgingFee;
	}
	
	get nexusBridgingFee(): string {
		return this._nexusBridgingFee;
	}

	get potentialWalletFee(): number {
		return this._potentialWalletFee;
	}
}

const appSettings = new AppSettings();
export default appSettings;