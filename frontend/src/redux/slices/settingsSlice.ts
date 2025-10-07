import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import appSettings from '../../settings/appSettings'
import { TxTypeEnum, SettingsFullResponseDto } from '../../swagger/apexBridgeApiService'

export type CardanoChainsNativeTokens = {
	[key: string]: { dstChainID: string; tokenName: string; }[];
}

export type LayerZeroChains = Record<string, { oftAddress: string; chainID: number, txType: TxTypeEnum }>;

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
}

const initialState: ISettingsState = {
	minUtxoChainValue: appSettings.minUtxoChainValue,
	minChainFeeForBridging: appSettings.minChainFeeForBridging,
	minOperationFee: appSettings.minOperationFee,
	maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
	maxTokenAmountAllowedToBridge: appSettings.maxTokenAmountAllowedToBridge,
	minValueToBridge: appSettings.minValueToBridge,
	cardanoChainsNativeTokens: {},
	enabledChains: appSettings.enabledChains,
	layerZeroChains: {}
}

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (state, action: PayloadAction<SettingsFullResponseDto>) => {
			state.minUtxoChainValue = Object.entries(action.payload.bridgingSettings.minUtxoChainValue).reduce((acc, [key, value]) => {
				acc[key] = value.toString();
				return acc;
			}, {} as { [key: string]: string });
			state.minChainFeeForBridging = Object.entries(action.payload.bridgingSettings.minChainFeeForBridging).reduce((acc, [key, value]) => {
				acc[key] = value.toString();
				return acc;
			}, {} as { [key: string]: string });
			state.minOperationFee = Object.entries(action.payload.bridgingSettings.minOperationFee).reduce((acc, [key, value]) => {
				acc[key] = value.toString();
				return acc;
			}, {} as { [key: string]: string });
			state.minValueToBridge = action.payload.bridgingSettings.minValueToBridge.toString();
			state.maxAmountAllowedToBridge = action.payload.bridgingSettings.maxAmountAllowedToBridge;
			state.maxTokenAmountAllowedToBridge = action.payload.bridgingSettings.maxTokenAmountAllowedToBridge;
			state.cardanoChainsNativeTokens = action.payload.cardanoChainsNativeTokens;
			state.enabledChains = action.payload.enabledChains;
			state.layerZeroChains = action.payload.layerZeroChains.reduce<LayerZeroChains>((acc, cfg) => {
			const key = String(cfg.chain).toLowerCase();
			acc[key] = { oftAddress: cfg.oftAddress, chainID: cfg.chainID, txType: cfg.txType };
			return acc;
			}, {});
		},
	},
})

// Action creators are generated for each case reducer function
export const { setSettingsAction } = settingsSlice.actions

export default settingsSlice.reducer
