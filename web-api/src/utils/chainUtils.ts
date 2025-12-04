import {
	BridgingModeEnum,
	ChainApexBridgeEnum,
	ChainEnum,
} from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';
import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsTokenPairDto,
	SettingsFullResponseDto,
	SettingsResponseDto,
} from 'src/settings/settings.dto';

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9069);

export const CHAIN_TO_CHAIN_ID = {
	[ChainApexBridgeEnum.Prime]: 1,
	[ChainApexBridgeEnum.Vector]: 2,
	[ChainApexBridgeEnum.Nexus]: 3,
	[ChainApexBridgeEnum.Cardano]: 4,
};

export type BridgingDirectionInfo = {
	srcChain: ChainEnum;
	dstChain: ChainEnum;
	bridgingMode: BridgingModeEnum;
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
	chain === ChainEnum.Cardano ||
	chain === ChainEnum.Prime ||
	chain === ChainEnum.Vector;

export const isEvmChain = (chain: ChainEnum) => chain === ChainEnum.Nexus;

const isAllowedDirection = function (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	srcTokenID: number,
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto },
): boolean {
	if (
		!directionConfig[srcChain] ||
		!directionConfig[srcChain].destChain[dstChain]
	) {
		return false;
	}

	const tokenPairs = directionConfig[srcChain].destChain[dstChain];

	return tokenPairs.some(
		(x: BridgingSettingsTokenPairDto) => x.srcTokenID === srcTokenID,
	);
};

export const getBridgingSettings = function (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	srcTokenID: number,
	fullSettings: SettingsFullResponseDto,
): SettingsResponseDto | undefined {
	if (!fullSettings) {
		return undefined;
	}
	const settingsReactor =
		fullSettings.settingsPerMode[BridgingModeEnum.Reactor];
	const settingsSkyline =
		fullSettings.settingsPerMode[BridgingModeEnum.Skyline];

	if (
		isAllowedDirection(
			srcChain,
			dstChain,
			srcTokenID,
			settingsReactor.bridgingSettings.directionConfig,
		)
	) {
		return settingsReactor;
	} else if (
		isAllowedDirection(
			srcChain,
			dstChain,
			srcTokenID,
			settingsSkyline.bridgingSettings.directionConfig,
		)
	) {
		return settingsSkyline;
	}
	return undefined;
};

export const getBridgingMode = function (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	srcTokenID: number,
	fullSettings: SettingsFullResponseDto,
): BridgingModeEnum | undefined {
	if (!fullSettings) {
		return undefined;
	}
	const settingsReactor =
		fullSettings.settingsPerMode[BridgingModeEnum.Reactor].bridgingSettings;
	const settingsSkyline =
		fullSettings.settingsPerMode[BridgingModeEnum.Skyline].bridgingSettings;

	if (
		isAllowedDirection(
			srcChain,
			dstChain,
			srcTokenID,
			settingsReactor.directionConfig,
		)
	) {
		return BridgingModeEnum.Reactor;
	} else if (
		isAllowedDirection(
			srcChain,
			dstChain,
			srcTokenID,
			settingsSkyline.directionConfig,
		)
	) {
		return BridgingModeEnum.Skyline;
	}

	if (
		srcChain != dstChain &&
		fullSettings.layerZeroChains.some((x) => x.chain == srcChain) &&
		fullSettings.layerZeroChains.some((x) => x.chain == dstChain)
	) {
		return BridgingModeEnum.LayerZero;
	}

	return undefined;
};
