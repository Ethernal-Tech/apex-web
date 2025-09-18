import { BridgingModeEnum, ChainApexBridgeEnum, ChainEnum } from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';
import { BridgingSettingsDto, SettingsFullResponseDto } from 'src/settings/settings.dto';

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9069);

export const CHAIN_TO_CHAIN_ID = {
	[ChainApexBridgeEnum.Prime]: 1,
	[ChainApexBridgeEnum.Vector]: 2,
	[ChainApexBridgeEnum.Nexus]: 3,
	[ChainApexBridgeEnum.Cardano]: 4,
};

const fromChainToNetworkId = (
	chain: ChainApexBridgeEnum,
	isMainnet: boolean,
): number | bigint | undefined => {
	switch (chain) {
		case ChainApexBridgeEnum.Prime: {
			return isMainnet
				? CardanoNetworkType.MainNetNetwork
				: CardanoNetworkType.TestNetNetwork;
		}
		case ChainApexBridgeEnum.Vector: {
			return CardanoNetworkType.MainNetNetwork;
		}
		case ChainApexBridgeEnum.Nexus: {
			return isMainnet ? NEXUS_MAINNET_CHAIN_ID : NEXUS_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Cardano: {
			return isMainnet
				? CardanoNetworkType.MainNetNetwork
				: CardanoNetworkType.TestNetNetwork;
		}
		default:
			return;
	}
};

export const areChainsEqual = (
	chain: ChainApexBridgeEnum,
	networkId: number | bigint,
	isMainnet: boolean,
): boolean => {
	return networkId === fromChainToNetworkId(chain, isMainnet);
};

export const toNumChainID = (chain: ChainApexBridgeEnum) =>
	CHAIN_TO_CHAIN_ID[chain];

export const isCardanoChain = (chain: ChainEnum) =>
	chain === ChainEnum.Cardano || chain === ChainEnum.Prime || chain === ChainEnum.Vector;

export const isEvmChain = (chain: ChainEnum) => chain === ChainEnum.Nexus;

export const isAllowedDirection = function (
	srcChain: ChainEnum, dstChain: ChainEnum, allowedDirections: { [key: string]: string[] },
): boolean {
	return (allowedDirections[srcChain] || []).includes(dstChain);
};

export const getBridgingSettings = function (
	srcChain: ChainEnum, dstChain: ChainEnum, fullSettings: SettingsFullResponseDto,
): BridgingSettingsDto | undefined {
	const settingsReactor = fullSettings.settingsPerMode[BridgingModeEnum.Reactor].bridgingSettings;
	const settingsSkyline = fullSettings.settingsPerMode[BridgingModeEnum.Skyline].bridgingSettings;
	
	if (isAllowedDirection(srcChain, dstChain, settingsReactor.allowedDirections)) {
		return settingsReactor;
	} else if (isAllowedDirection(srcChain, dstChain,settingsSkyline.allowedDirections)) {
		return settingsSkyline;
	}
	return undefined;
}

export const getBridgingMode = function (
	srcChain: ChainEnum, dstChain: ChainEnum, fullSettings: SettingsFullResponseDto,
): BridgingModeEnum {
	const settingsReactor = fullSettings.settingsPerMode[BridgingModeEnum.Reactor].bridgingSettings;
	const settingsSkyline = fullSettings.settingsPerMode[BridgingModeEnum.Skyline].bridgingSettings;

	if (isAllowedDirection(srcChain, dstChain, settingsReactor.allowedDirections)) {
		return BridgingModeEnum.Reactor;
	} else if (isAllowedDirection(srcChain, dstChain, settingsSkyline.allowedDirections)) {
		return BridgingModeEnum.Skyline;
	}
	return BridgingModeEnum.LayerZero;
}