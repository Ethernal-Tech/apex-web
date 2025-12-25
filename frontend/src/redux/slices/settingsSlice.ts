import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import appSettings from '../../settings/appSettings';
import {
	AllBridgingAddressesDto,
	BridgingSettingsDto,
	SettingsFullResponseDto,
	SettingsResponseDto,
} from '../../swagger/apexBridgeApiService';
import { ISettingsState, LayerZeroChains } from '../../settings/settingsRedux';
import { BridgingModeEnum } from '../../settings/chain';

const initialState: ISettingsState = {
	settingsPerMode: {
		[BridgingModeEnum.Skyline]: new SettingsResponseDto({
			bridgingSettings: new BridgingSettingsDto({
				minUtxoChainValue: appSettings.minUtxoChainValue,
				minChainFeeForBridging: appSettings.minChainFeeForBridging,
				minChainFeeForBridgingTokens:
					appSettings.minChainFeeForBridging,
				minOperationFee: appSettings.minOperationFee,
				maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
				maxTokenAmountAllowedToBridge:
					appSettings.maxTokenAmountAllowedToBridge,
				minValueToBridge: appSettings.minValueToBridge,
				minColCoinsAllowedToBridge:
					appSettings.minColCoinsAllowedToBridge,
				maxReceiversPerBridgingRequest: 0,
				directionConfig: {},
				ecosystemTokens: [],
			}),
			enabledChains: [],
		}),
		[BridgingModeEnum.Reactor]: new SettingsResponseDto({
			bridgingSettings: new BridgingSettingsDto({
				minUtxoChainValue: appSettings.minUtxoChainValue,
				minChainFeeForBridging: appSettings.minChainFeeForBridging,
				minChainFeeForBridgingTokens: {},
				minOperationFee: {},
				maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
				maxTokenAmountAllowedToBridge: '0',
				minValueToBridge: appSettings.minValueToBridge,
				minColCoinsAllowedToBridge: 0,
				maxReceiversPerBridgingRequest: 0,
				directionConfig: {},
				ecosystemTokens: [],
			}),
			enabledChains: [],
		}),
	},
	layerZeroChains: {},
	enabledChains: appSettings.enabledChains,
	directionConfig: {},
	ecosystemTokens: [],
	bridgingAddresses: [],
	reactorValidatorStatus: undefined,
};

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (
			state,
			action: PayloadAction<SettingsFullResponseDto>,
		) => {
			state.ecosystemTokens = action.payload.ecosystemTokens;
			state.directionConfig = action.payload.directionConfig;
			state.enabledChains = action.payload.enabledChains;
			state.settingsPerMode = action.payload.settingsPerMode;
			state.layerZeroChains =
				action.payload.layerZeroChains.reduce<LayerZeroChains>(
					(acc, cfg) => {
						const key = String(cfg.chain).toLowerCase();
						acc[key] = {
							oftAddress: cfg.oftAddress,
							chainID: cfg.chainID,
							txType: cfg.txType,
						};
						return acc;
					},
					{},
				);
		},
		setBridgingAddressesAction: (
			state,
			action: PayloadAction<AllBridgingAddressesDto>,
		) => {
			state.bridgingAddresses = action.payload.addresses;
		},
		clearBridgingAddressesAction: (state) => {
			state.bridgingAddresses = [];
		},
		setReactorValidatorStatus: (state, action: PayloadAction<boolean>) => {
			state.reactorValidatorStatus = action.payload;
		},
	},
});

// Action creators are generated for each case reducer function
export const {
	setSettingsAction,
	setBridgingAddressesAction,
	clearBridgingAddressesAction,
	setReactorValidatorStatus,
} = settingsSlice.actions;

export default settingsSlice.reducer;
