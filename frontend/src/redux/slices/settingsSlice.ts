import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import appSettings from '../../settings/appSettings'
import { ChainEnum, SettingsResponseDto } from '../../swagger/apexBridgeApiService'

export interface ISettingsState {
	minUtxoChainValue: { [key: string]: string }
	minChainFeeForBridging: { [key: string]: string }
	maxAmountAllowedToBridge: string
	minValueToBridge: string
}

const initialState: ISettingsState = {
	minUtxoChainValue: appSettings.minUtxoChainValue,
	minChainFeeForBridging: appSettings.minChainFeeForBridging,
	maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
	minValueToBridge: appSettings.minValueToBridge,
}

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (state, action: PayloadAction<SettingsResponseDto>) => {
			state.minUtxoChainValue = Object.entries(action.payload.minUtxoChainValue).reduce((acc, [key, value]) => {
				acc[key] = value.toString();
				return acc;
			}, {} as { [key: string]: string });
			state.minChainFeeForBridging = Object.entries(action.payload.minChainFeeForBridging).reduce((acc, [key, value]) => {
				const chainKey = key as ChainEnum;
				acc[chainKey] = value.toString();
				return acc;
			}, {} as { [key: string]: string });
			state.minValueToBridge = action.payload.minValueToBridge.toString();
			state.maxAmountAllowedToBridge = action.payload.maxAmountAllowedToBridge;
		},
	},
})

// Action creators are generated for each case reducer function
export const { setSettingsAction } = settingsSlice.actions

export default settingsSlice.reducer
