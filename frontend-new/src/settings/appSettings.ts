import developmentSettings from "./appSettings_development.json";
import productionSettings from "./appSettings_production.json";

type AppSettingsJson = {
  apiUrl: string;
  /** Public origin of this frontend, no trailing slash. Used for canonical/og URLs. */
  siteUrl: string;
  sentryDsn: string;
  minUtxoChainValue: { [key: string]: number };
  minChainFeeForBridging: { [key: string]: string };
  minOperationFee: { [key: string]: string };
  maxAmountAllowedToBridge: string;
  maxTokenAmountAllowedToBridge: string;
  minValueToBridge: number;
  minColCoinsAllowedToBridge: { [key: string]: string };
  potentialWalletFee: number;
  disableSentry?: boolean;
  isMainnet: boolean;
  isSkyline: boolean;
  balanceFormatting: boolean;
};

class AppSettings {
  private _apiUrl = "http://localhost:30000";
  private _siteUrl = "http://localhost:8080";
  private _sentryDsn = "";
  private _minUtxoChainValue: { [key: string]: number } = {};
  private _minChainFeeForBridging: { [key: string]: string } = {};
  private _minOperationFee: { [key: string]: string } = {};
  private _maxAmountAllowedToBridge = "0";
  private _maxTokenAmountAllowedToBridge = "0";
  private _minValueToBridge = 0;
  private _minColCoinsAllowedToBridge: { [key: string]: string } = {};
  private _potentialWalletFee = 0;
  private _disableSentry = false;
  private _isMainnet = false;
  private _isSkyline = false;
  private _balanceFormatting = false;

  public constructor() {
    const settingsJson = (
      import.meta.env.DEV ? developmentSettings : productionSettings
    ) as AppSettingsJson;

    this._apiUrl = settingsJson.apiUrl.replace(/\/$/, "");
    this._siteUrl = settingsJson.siteUrl.replace(/\/$/, "");
    this._sentryDsn = settingsJson.sentryDsn;
    this._minUtxoChainValue = settingsJson.minUtxoChainValue;
    this._minChainFeeForBridging = settingsJson.minChainFeeForBridging;
    this._minOperationFee = settingsJson.minOperationFee;
    this._maxAmountAllowedToBridge = settingsJson.maxAmountAllowedToBridge;
    this._maxTokenAmountAllowedToBridge =
      settingsJson.maxTokenAmountAllowedToBridge;
    this._minValueToBridge = settingsJson.minValueToBridge;
    this._minColCoinsAllowedToBridge = settingsJson.minColCoinsAllowedToBridge;
    this._potentialWalletFee = settingsJson.potentialWalletFee;
    this._disableSentry = settingsJson.disableSentry ?? false;
    this._isMainnet = settingsJson.isMainnet;
    this._isSkyline = settingsJson.isSkyline;
    this._balanceFormatting = settingsJson.balanceFormatting;
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get siteUrl(): string {
    return this._siteUrl;
  }

  get sentryDsn(): string {
    return this._sentryDsn;
  }

  get minUtxoChainValue(): { [key: string]: number } {
    return this._minUtxoChainValue;
  }

  get minChainFeeForBridging(): { [key: string]: string } {
    return this._minChainFeeForBridging;
  }

  get minOperationFee(): { [key: string]: string } {
    return this._minOperationFee;
  }

  get maxAmountAllowedToBridge(): string {
    return this._maxAmountAllowedToBridge;
  }

  get maxTokenAmountAllowedToBridge(): string {
    return this._maxTokenAmountAllowedToBridge;
  }

  get minValueToBridge(): number {
    return this._minValueToBridge;
  }

  get minColCoinsAllowedToBridge(): { [key: string]: string } {
    return this._minColCoinsAllowedToBridge;
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

  get balanceFormatting(): boolean {
    return this._balanceFormatting;
  }
}

const appSettings = new AppSettings();
export default appSettings;
