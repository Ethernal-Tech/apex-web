import {
	BridgingModeEnum,
	ChainApexBridgeEnum,
	ChainEnum,
	TokenEnum,
} from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';
import {
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
	allowedDirections: { [key: string]: string[] },
): boolean {
	return (allowedDirections[srcChain] || []).includes(dstChain);
};

export const getBridgingSettings = function (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
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
			settingsReactor.bridgingSettings.allowedDirections,
		)
	) {
		return settingsReactor;
	} else if (
		isAllowedDirection(
			srcChain,
			dstChain,
			settingsSkyline.bridgingSettings.allowedDirections,
		)
	) {
		return settingsSkyline;
	}
	return undefined;
};

export const getBridgingMode = function (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
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
		isAllowedDirection(srcChain, dstChain, settingsReactor.allowedDirections)
	) {
		return BridgingModeEnum.Reactor;
	} else if (
		isAllowedDirection(srcChain, dstChain, settingsSkyline.allowedDirections)
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

export const getAllChainsDirections = function (
	allowedBridgingModes: BridgingModeEnum[],
	settings: SettingsFullResponseDto,
): BridgingDirectionInfo[] {
	if (allowedBridgingModes.length == 0 || !settings) {
		return [];
	}

	const result: BridgingDirectionInfo[] = [];
	const chains = Object.values(ChainEnum);

	for (const srcChain of chains) {
		for (const dstChain of chains) {
			const bridgingMode = getBridgingMode(srcChain, dstChain, settings);
			if (!!bridgingMode && allowedBridgingModes.includes(bridgingMode)) {
				result.push({
					srcChain,
					dstChain,
					bridgingMode,
				});
			}
		}
	}

	return result;
};

export const getTokenNameFromSettings = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	settings: SettingsFullResponseDto,
): string | undefined => {
	switch (getBridgingMode(srcChain, dstChain, settings)) {
		case BridgingModeEnum.LayerZero:
			switch (srcChain) {
				case ChainEnum.BNB:
					return TokenEnum.BNAP3X;
				case ChainEnum.Base:
					return TokenEnum.BAP3X;
			}
			return undefined;
		case BridgingModeEnum.Skyline: {
			const nativeTokens =
				settings?.settingsPerMode[BridgingModeEnum.Skyline]
					.cardanoChainsNativeTokens[srcChain];
			return nativeTokens
				?.find((x) => x.dstChainID === dstChain)
				?.tokenName.trim();
		}
	}
};
