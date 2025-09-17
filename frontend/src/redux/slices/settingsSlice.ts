import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import appSettings from '../../settings/appSettings'
import { SettingsFullResponseDto } from '../../swagger/apexBridgeApiService'
import { ISettingsState, LayerZeroChains } from '../../settings/settingsRedux'

const initialState: ISettingsState = {
	minUtxoChainValue: appSettings.minUtxoChainValue,
	minChainFeeForBridging: appSettings.minChainFeeForBridging,
	minOperationFee: appSettings.minOperationFee,
	maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
	maxTokenAmountAllowedToBridge: appSettings.maxTokenAmountAllowedToBridge,
	minValueToBridge: appSettings.minValueToBridge,
	cardanoChainsNativeTokens: {},
	enabledChains: appSettings.enabledChains,
	layerZeroChains: {},
	allowedDirections: {},
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
			state.allowedDirections = Object.entries(action.payload.bridgingSettings.allowedDirections).reduce((acc, [key, value]) => {
				acc[key] = value;
				return acc;
			}, {} as { [key: string]: string[] });
			state.minValueToBridge = action.payload.bridgingSettings.minValueToBridge.toString();
			state.maxAmountAllowedToBridge = action.payload.bridgingSettings.maxAmountAllowedToBridge;
			state.maxTokenAmountAllowedToBridge = action.payload.bridgingSettings.maxTokenAmountAllowedToBridge;
			state.cardanoChainsNativeTokens = action.payload.cardanoChainsNativeTokens;
			state.enabledChains = action.payload.enabledChains;
			state.layerZeroChains = action.payload.layerZeroChains.reduce<LayerZeroChains>((acc, cfg) => {
				const key = String(cfg.chain).toLowerCase();
				acc[key] = { oftAddress: cfg.oftAddress, chainID: cfg.chainID };
				return acc;
			}, {});
		},
	},
})

// Action creators are generated for each case reducer function
export const { setSettingsAction } = settingsSlice.actions

export default settingsSlice.reducer
