import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import appSettings from '../../settings/appSettings';
import { SettingsResponseDto } from '../../swagger/apexBridgeApiService';

export interface ISettingsState {
	minUtxoValue: string;
	minBridgingFee: string;
	maxAllowedToBridge: string;
}

const initialState: ISettingsState = {
	minUtxoValue: appSettings.minUtxoValue,
	minBridgingFee: appSettings.minBridgingFee,
	maxAllowedToBridge: appSettings.maxAllowedToBridge,
};

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (
			state,
			action: PayloadAction<SettingsResponseDto>,
		) => {
			state.minUtxoValue = action.payload.minUtxoValue.toString();
			state.minBridgingFee = action.payload.minFeeForBridging.toString();
			state.maxAllowedToBridge = action.payload.maxAmountAllowedToBridge;
		},
	},
});

// Action creators are generated for each case reducer function
export const { setSettingsAction } = settingsSlice.actions;

export default settingsSlice.reducer;
