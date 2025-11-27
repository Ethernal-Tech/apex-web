export class AppSettings {
	private _apiUrl = 'https://localhost:30000';

	private _sentryDsn = '';

	private _minUtxoChainValue: { [key: string]: string } = {
		prime: '0',
		vector: '0',
		cardano: '0',
	};

	private _minChainFeeForBridging: { [key: string]: string } = {
		nexus: '0',
		prime: '0',
		vector: '0',
		cardano: '0',
	};

	private _minOperationFee: { [key: string]: string } = {
		nexus: '0',
		prime: '0',
		vector: '0',
		cardano: '0',
	};

	private _utxoRetriever: UtxoRetrieverConfig = {};
	private _maxAmountAllowedToBridge = '0';
	private _maxTokenAmountAllowedToBridge = '0';
	private _minValueToBridge = '0';
	private _potentialWalletFee = 0;
	private _disableSentry = false;
	private _isMainnet = false;
	private _isSkyline = false;

	private _enabledChains: string[] = [];

	public constructor() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const settingsJson = require(
			process.env.NODE_ENV === 'development'
				? './appSettings_development.json'
				: './appSettings_production.json',
		);
		this._apiUrl = settingsJson.apiUrl;
		this._sentryDsn = settingsJson.sentryDsn;
		this._minUtxoChainValue = settingsJson.minUtxoChainValue;
		this._minChainFeeForBridging = settingsJson.minChainFeeForBridging;
		this._minOperationFee = settingsJson.minOperationFee;
		this._utxoRetriever = settingsJson.utxoRetriever;
		this._maxAmountAllowedToBridge = settingsJson.maxAmountAllowedToBridge;
		this._maxTokenAmountAllowedToBridge =
			settingsJson.maxTokenAmountAllowedToBridge;
		this._minValueToBridge = settingsJson.minValueToBridge;
		this._potentialWalletFee = settingsJson.potentialWalletFee;
		this._disableSentry = settingsJson.disableSentry;
		this._isMainnet = settingsJson.isMainnet;
		this._isSkyline = settingsJson.isSkyline;
	}

	get apiUrl(): string {
		return this._apiUrl;
	}

	get sentryDsn(): string {
		return this._sentryDsn;
	}

	get minUtxoChainValue(): { [key: string]: string } {
		return this._minUtxoChainValue;
	}

	get minChainFeeForBridging(): { [key: string]: string } {
		return this._minChainFeeForBridging;
	}

	get minOperationFee(): { [key: string]: string } {
		return this._minOperationFee;
	}

	get utxoRetriever(): UtxoRetrieverConfig {
		return this._utxoRetriever;
	}

	get maxAmountAllowedToBridge(): string {
		return this._maxAmountAllowedToBridge;
	}

	get maxTokenAmountAllowedToBridge(): string {
		return this._maxTokenAmountAllowedToBridge;
	}

	get minValueToBridge(): string {
		return this._minValueToBridge;
	}

	get potentialWalletFee(): number {
		return this._potentialWalletFee;
	}

	get disableSentry(): boolean {
		return this._disableSentry;
	}

	get isMainnet(): boolean {
		return this._isMainnet;
	}

	get isSkyline(): boolean {
		return this._isSkyline;
	}

	get enabledChains(): string[] {
		return this._enabledChains;
	}
}

const appSettings = new AppSettings();
export default appSettings;

type UtxoRetrieverConfig = {
	[key: string]: {
		type: string;
		url: string;
		dmtrApiKey: string | undefined;
		force: boolean;
	};
};
