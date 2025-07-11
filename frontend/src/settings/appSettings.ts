export class AppSettings {
	private _apiUrl: string = 'https://localhost:30000';

    private _minUtxoChainValue: { [key: string]: string } = {
		prime: "0",
		vector: "0"
	};

	private _minChainFeeForBridging: { [key: string]: string } = {
		nexus: "0",
		prime: "0",
		vector: "0"
	};
	private _blockfrost: {[key: string]: {baseUrl: string, dmtrApiKey: string | undefined }} = {};

    private _maxAmountAllowedToBridge: string = "0";
    private _minValueToBridge: string = "0";
	private _potentialWalletFee: number = 0;
	private _isMainnet: boolean = false;

	private _enabledChains: string[] = [];

    public constructor() {
		const settingsJson = require(process.env.NODE_ENV === 'development' ? './appSettings_development.json' : './appSettings_production.json');
		this._apiUrl = settingsJson.apiUrl;
		this._minUtxoChainValue = settingsJson.minUtxoChainValue;
		this._minChainFeeForBridging = settingsJson.minChainFeeForBridging;
		this._blockfrost = settingsJson.blockfrost;
		this._maxAmountAllowedToBridge = settingsJson.maxAmountAllowedToBridge;
		this._minValueToBridge = settingsJson.minValueToBridge;
		this._potentialWalletFee = settingsJson.potentialWalletFee;
		this._isMainnet = settingsJson.isMainnet;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get minUtxoChainValue(): { [key: string]: string } {
		return this._minUtxoChainValue;
	}

	get minChainFeeForBridging(): { [key: string]: string } {
		return this._minChainFeeForBridging;
	}

	get blockfrost(): {[key: string]: {baseUrl: string, dmtrApiKey: string | undefined }} {
		return this._blockfrost;
	}

	get maxAmountAllowedToBridge(): string {
		return this._maxAmountAllowedToBridge;
	}

	get minValueToBridge(): string {
		return this._minValueToBridge;
	}

	get potentialWalletFee(): number {
		return this._potentialWalletFee;
	}

	get isMainnet(): boolean {
		return this._isMainnet;
	}

	get enabledChains(): string[] {
		return this._enabledChains;
	}
}

const appSettings = new AppSettings();
export default appSettings;