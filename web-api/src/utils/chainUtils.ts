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

const POLYGON_TESTNET_CHAIN_ID = BigInt(80002);
const POLYGON_MAINNET_CHAIN_ID = BigInt(137);

const ETHEREUM_TESTNET_CHAIN_ID = BigInt(11155111);
const ETHEREUM_MAINNET_CHAIN_ID = BigInt(1);

const KATANA_TESTNET_CHAIN_ID = BigInt(737373);
const KATANA_MAINNET_CHAIN_ID = BigInt(747474);

const SEI_TESTNET_CHAIN_ID = BigInt(1328);
const SEI_MAINNET_CHAIN_ID = BigInt(1329);

const ARBITRUM_TESTNET_CHAIN_ID = BigInt(421614);
const ARBITRUM_MAINNET_CHAIN_ID = BigInt(42161);

const SCROLL_TESTNET_CHAIN_ID = BigInt(534351);
const SCROLL_MAINNET_CHAIN_ID = BigInt(534352);

const UNICHAIN_TESTNET_CHAIN_ID = BigInt(1301);
const UNICHAIN_MAINNET_CHAIN_ID = BigInt(130);

export const CHAIN_TO_CHAIN_ID = {
	[ChainApexBridgeEnum.Prime]: 1,
	[ChainApexBridgeEnum.Vector]: 2,
	[ChainApexBridgeEnum.Nexus]: 3,
	[ChainApexBridgeEnum.Cardano]: 4,
	[ChainApexBridgeEnum.Polygon]: 5,
	[ChainApexBridgeEnum.Ethereum]: 6,
	[ChainApexBridgeEnum.Katana]: 7,
	[ChainApexBridgeEnum.Sei]: 8,
	[ChainApexBridgeEnum.Arbitrum]: 9,
	[ChainApexBridgeEnum.Scroll]: 10,
	[ChainApexBridgeEnum.Unichain]: 11,
};

export type BridgingDirectionInfo = {
	srcChain: ChainEnum;
	dstChain: ChainEnum;
	bridgingMode: BridgingModeEnum;
};

export const fromChainToNetworkId = (
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
		case ChainApexBridgeEnum.Polygon: {
			return isMainnet ? POLYGON_MAINNET_CHAIN_ID : POLYGON_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Ethereum: {
			return isMainnet ? ETHEREUM_MAINNET_CHAIN_ID : ETHEREUM_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Katana: {
			return isMainnet ? KATANA_MAINNET_CHAIN_ID : KATANA_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Sei: {
			return isMainnet ? SEI_MAINNET_CHAIN_ID : SEI_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Arbitrum: {
			return isMainnet ? ARBITRUM_MAINNET_CHAIN_ID : ARBITRUM_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Scroll: {
			return isMainnet ? SCROLL_MAINNET_CHAIN_ID : SCROLL_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Unichain: {
			return isMainnet ? UNICHAIN_MAINNET_CHAIN_ID : UNICHAIN_TESTNET_CHAIN_ID;
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

export const isEvmChain = (chain: ChainEnum) =>
	chain === ChainEnum.Nexus ||
	chain === ChainEnum.Polygon ||
	chain === ChainEnum.Ethereum ||
	chain === ChainEnum.Katana ||
	chain === ChainEnum.Sei ||
	chain === ChainEnum.Arbitrum ||
	chain === ChainEnum.Scroll ||
	chain === ChainEnum.Unichain;

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
		fullSettings.layerZeroChains.some((x) => x.chain == dstChain) &&
		isAllowedDirection(
			srcChain,
			dstChain,
			srcTokenID,
			fullSettings.directionConfig,
		)
	) {
		return BridgingModeEnum.LayerZero;
	}

	return undefined;
};
