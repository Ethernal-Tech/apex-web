import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import appSettings from '../../settings/appSettings';
import { SettingsResponseDto } from '../../swagger/apexBridgeApiService';

export interface ISettingsState {
	minUtxoChainValue: { [key: string]: string };
	minChainFeeForBridging: { [key: string]: string };
	maxAmountAllowedToBridge: string;
	minValueToBridge: string;
	enabledChains: string[];
	allowedDirections: { [key: string]: string[] };
}

const initialState: ISettingsState = {
	minUtxoChainValue: appSettings.minUtxoChainValue,
	minChainFeeForBridging: appSettings.minChainFeeForBridging,
	maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
	minValueToBridge: appSettings.minValueToBridge,
	enabledChains: appSettings.enabledChains,
	allowedDirections: {},
};

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (
			state,
			action: PayloadAction<SettingsResponseDto>,
		) => {
			state.minUtxoChainValue = Object.entries(
				action.payload.bridgingSettings.minUtxoChainValue,
			).reduce(
				(acc, [key, value]) => {
					acc[key] = value.toString();
					return acc;
				},
				{} as { [key: string]: string },
			);
			state.minChainFeeForBridging = Object.entries(
				action.payload.bridgingSettings.minChainFeeForBridging,
			).reduce(
				(acc, [key, value]) => {
					acc[key] = value.toString();
					return acc;
				},
				{} as { [key: string]: string },
			);
			state.allowedDirections = Object.entries(
				action.payload.bridgingSettings.allowedDirections,
			).reduce(
				(acc, [key, value]) => {
					acc[key] = value;
					return acc;
				},
				{} as { [key: string]: string[] },
			);
			state.minValueToBridge =
				action.payload.bridgingSettings.minValueToBridge.toString();
			state.maxAmountAllowedToBridge =
				action.payload.bridgingSettings.maxAmountAllowedToBridge;
			state.enabledChains = action.payload.enabledChains;
		},
	},
});

// Action creators are generated for each case reducer function
export const { setSettingsAction } = settingsSlice.actions;

export default settingsSlice.reducer;
