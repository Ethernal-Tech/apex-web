import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
	SettingsResponseDto,
	TxTypeEnum,
} from '../swagger/apexBridgeApiService';

export type LayerZeroChains = Record<
	string,
	{ oftAddress: string; chainID: number; txType: TxTypeEnum }
>;

export interface ISettingsState {
	settingsPerMode: { [key: string]: SettingsResponseDto };
	layerZeroChains: LayerZeroChains;
	enabledChains: string[];
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };
	ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
	bridgingAddresses: string[];
	reactorValidatorStatus: boolean | undefined;
}
