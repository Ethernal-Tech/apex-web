import { TxTypeEnum } from '../swagger/apexBridgeApiService';

export type CardanoChainsNativeTokens = {
	[key: string]: { dstChainID: string; tokenName: string }[];
};

export type LayerZeroChains = Record<
	string,
	{ oftAddress: string; chainID: number; txType: TxTypeEnum }
>;

export interface SettingsPerMode {
	minUtxoChainValue: { [key: string]: string };
	minChainFeeForBridging: { [key: string]: string };
	minChainFeeForBridgingTokens: { [key: string]: string };
	minOperationFee: { [key: string]: string };
	maxAmountAllowedToBridge: string;
	maxTokenAmountAllowedToBridge: string;
	minValueToBridge: string;
	cardanoChainsNativeTokens: CardanoChainsNativeTokens;
	allowedDirections: { [key: string]: string[] };
}

export interface ISettingsState {
	settingsPerMode: { [key: string]: SettingsPerMode };
	enabledChains: string[];
	allowedDirections: { [key: string]: string[] };
	layerZeroChains: LayerZeroChains;
	bridgingAddresses: string[];
}
