import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import appSettings from '../../settings/appSettings';
import {
	AllBridgingAddressesDto,
	SettingsFullResponseDto,
} from '../../swagger/apexBridgeApiService';
import {
	ISettingsState,
	LayerZeroChains,
	SettingsPerMode,
} from '../../settings/settingsRedux';
import { BridgingModeEnum } from '../../settings/chain';

const initialState: ISettingsState = {
	settingsPerMode: {
		[BridgingModeEnum.Skyline]: {
			minUtxoChainValue: appSettings.minUtxoChainValue,
			minChainFeeForBridging: appSettings.minChainFeeForBridging,
			minChainFeeForBridgingTokens: appSettings.minChainFeeForBridging,
			minOperationFee: appSettings.minOperationFee,
			maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
			maxTokenAmountAllowedToBridge:
				appSettings.maxTokenAmountAllowedToBridge,
			minValueToBridge: appSettings.minValueToBridge,
			cardanoChainsNativeTokens: {},
			allowedDirections: {},
		},
		[BridgingModeEnum.Reactor]: {
			minUtxoChainValue: appSettings.minUtxoChainValue,
			minChainFeeForBridging: appSettings.minChainFeeForBridging,
			minChainFeeForBridgingTokens: appSettings.minChainFeeForBridging,
			minOperationFee: appSettings.minOperationFee,
			maxAmountAllowedToBridge: appSettings.maxAmountAllowedToBridge,
			maxTokenAmountAllowedToBridge:
				appSettings.maxTokenAmountAllowedToBridge,
			minValueToBridge: appSettings.minValueToBridge,
			cardanoChainsNativeTokens: {},
			allowedDirections: {},
		},
	},
	enabledChains: appSettings.enabledChains,
	allowedDirections: {},
	layerZeroChains: {},
	bridgingAddresses: [],
};

const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		setSettingsAction: (
			state,
			action: PayloadAction<SettingsFullResponseDto>,
		) => {
			state.enabledChains = action.payload.enabledChains;
			state.allowedDirections = action.payload.allowedDirections;
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
			state.settingsPerMode = Object.entries(
				action.payload.settingsPerMode,
			).reduce(
				(acc, [mode, modeSettings]) => {
					acc[mode] = {
						minUtxoChainValue: Object.entries(
							modeSettings.bridgingSettings.minUtxoChainValue,
						).reduce(
							(acc, [key, value]) => {
								acc[key] = value.toString();
								return acc;
							},
							{} as { [key: string]: string },
						),
						minChainFeeForBridging: Object.entries(
							modeSettings.bridgingSettings
								.minChainFeeForBridging,
						).reduce(
							(acc, [key, value]) => {
								acc[key] = value.toString();
								return acc;
							},
							{} as { [key: string]: string },
						),
						minChainFeeForBridgingTokens: Object.entries(
							modeSettings.bridgingSettings
								.minChainFeeForBridgingTokens || [],
						).reduce(
							(acc, [key, value]) => {
								acc[key] = value.toString();
								return acc;
							},
							{} as { [key: string]: string },
						),
						minOperationFee: Object.entries(
							modeSettings.bridgingSettings.minOperationFee || {},
						).reduce(
							(acc, [key, value]) => {
								acc[key] = value.toString();
								return acc;
							},
							{} as { [key: string]: string },
						),
						maxAmountAllowedToBridge:
							modeSettings.bridgingSettings
								.maxAmountAllowedToBridge,
						maxTokenAmountAllowedToBridge:
							modeSettings.bridgingSettings
								.maxTokenAmountAllowedToBridge,
						minValueToBridge:
							modeSettings.bridgingSettings.minValueToBridge.toString(),
						cardanoChainsNativeTokens:
							modeSettings.cardanoChainsNativeTokens,
						allowedDirections:
							modeSettings.bridgingSettings.allowedDirections,
					};

					return acc;
				},
				{} as { [key: string]: SettingsPerMode },
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
	},
});

// Action creators are generated for each case reducer function
export const {
	setSettingsAction,
	setBridgingAddressesAction,
	clearBridgingAddressesAction,
} = settingsSlice.actions;

export default settingsSlice.reducer;
