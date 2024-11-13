export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';

    private _minUtxoValue: string = "0";
    private _minBridgingFee: string = "0";
    private _maxAllowedToBridge: string = "0";
	
	private _potentialWalletFee: number = 0;

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._minUtxoValue = settingsJson.minUtxoValue;
		this._minBridgingFee = settingsJson.minBridgingFee;
		this._maxAllowedToBridge = settingsJson.maxAllowedToBridge;
		this._potentialWalletFee = settingsJson.potentialWalletFee;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get minUtxoValue(): string {
		return this._minUtxoValue;
	}

	get minBridgingFee(): string {
		return this._minBridgingFee;
	}

	get maxAllowedToBridge(): string {
		return this._maxAllowedToBridge;
	}

	get potentialWalletFee(): number {
		return this._potentialWalletFee;
	}
}

const appSettings = new AppSettings();
export default appSettings;