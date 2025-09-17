export type CardanoChainsNativeTokens = {
	[key: string]: { dstChainID: string; tokenName: string; }[];
}

export type LayerZeroChains = Record<string, { oftAddress: string; chainID: number }>;

export interface ISettingsState {
	minUtxoChainValue: { [key: string]: string }
	minChainFeeForBridging: { [key: string]: string }
	minOperationFee: { [key: string]: string }
	maxAmountAllowedToBridge: string
	maxTokenAmountAllowedToBridge: string
	minValueToBridge: string
	cardanoChainsNativeTokens: CardanoChainsNativeTokens
	enabledChains: string[]
	layerZeroChains: LayerZeroChains
	allowedDirections: { [key: string]: string[] }
}
