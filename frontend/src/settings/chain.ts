import { SVGProps } from 'react';
import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsTokenPairDto,
	ChainApexBridgeEnum,
	ChainEnum,
	SettingsResponseDto,
} from '../swagger/apexBridgeApiService';
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { ReactComponent as CardanoIcon } from '../assets/chain-icons/cardano.svg';
import { ReactComponent as BaseIcon } from '../assets/chain-icons/base.svg';
import { ReactComponent as BNBIcon } from '../assets/chain-icons/bsc.svg';
import { ISettingsState } from './settingsRedux';
import appSettings from './appSettings';
import { captureAndThrowError } from '../features/sentry';

export enum BridgingModeEnum {
	Reactor = 'reactor',
	Skyline = 'skyline',
	LayerZero = 'layerzero',
	Unknown = 'unknown',
}

export type BridgingModeWithSettings = {
	settings?: SettingsResponseDto;
	bridgingMode: BridgingModeEnum;
};

export type ChainInfo = {
	value: ChainEnum;
	label: string;
	icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
	letter: string;
	mainColor: string;
	borderColor: string;
	order: number;
};

const unknownChainInfo: ChainInfo = {
	value: ChainEnum.Prime,
	label: '',
	icon: PrimeIcon,
	letter: '',
	mainColor: 'transparent',
	borderColor: 'transparent',
	order: 1000,
};

const chainInfoMapping: Partial<Record<ChainEnum, ChainInfo>> = {
	[ChainEnum.Prime]: {
		value: ChainEnum.Prime,
		label: 'Prime',
		icon: PrimeIcon,
		borderColor: '#077368',
		letter: 'P',
		mainColor: '#077368',
		order: 1,
	},
	[ChainEnum.Vector]: {
		value: ChainEnum.Vector,
		label: 'Vector',
		icon: VectorIcon,
		borderColor: '#F25041',
		letter: 'V',
		mainColor: '#F25041',
		order: 3,
	},
	[ChainEnum.Nexus]: {
		value: ChainEnum.Nexus,
		label: 'Nexus',
		icon: NexusIcon,
		borderColor: '#F27B50',
		letter: 'N',
		mainColor: '#F27B50',
		order: 4,
	},
	[ChainEnum.Cardano]: {
		value: ChainEnum.Cardano,
		label: 'Cardano',
		icon: CardanoIcon,
		borderColor: '#0538AF',
		letter: 'C',
		mainColor: '#0538AF',
		order: 2,
	},
	[ChainEnum.Base]: {
		value: ChainEnum.Base,
		label: 'Base',
		icon: BaseIcon,
		borderColor: '#0052FF',
		letter: 'B',
		mainColor: '#0052FF',
		order: 5,
	},
	[ChainEnum.Bsc]: {
		value: ChainEnum.Bsc,
		label: 'BNB Smart Chain',
		icon: BNBIcon,
		borderColor: '#F3BA2F',
		letter: 'B',
		mainColor: '#F3BA2F',
		order: 6,
	},
};

const getChainDirections = function (
	settings: ISettingsState,
): Partial<Record<ChainEnum, BridgingSettingsDirectionConfigDto>> {
	// for skyline retrieve merged directions
	if (appSettings.isSkyline) {
		return settings.directionConfig;
	}
	// for reactor just allowed directions for reactor
	return settings.settingsPerMode[BridgingModeEnum.Reactor].bridgingSettings
		.directionConfig;
};

const prepareChainsList = function (
	chains: ChainEnum[] | undefined,
	settings: ISettingsState,
): ChainEnum[] {
	return (chains || [])
		.filter((x) => settings.enabledChains.includes(x))
		.sort((a, b) => getChainInfo(a).order - getChainInfo(b).order);
};

export const getChainInfo = function (chain: ChainEnum): ChainInfo {
	return chainInfoMapping[chain] || unknownChainInfo;
};

export const getDstChains = function (
	chain: ChainEnum | undefined,
	settings: ISettingsState,
): ChainEnum[] {
	if (!chain) {
		return [];
	}

	const directionsConfig = getChainDirections(settings);
	const dstChains = directionsConfig[chain]?.destChain || {};

	return prepareChainsList(Object.keys(dstChains) as ChainEnum[], settings);
};

export const getSrcChains = function (settings: ISettingsState): ChainEnum[] {
	const directionsConfig = getChainDirections(settings);
	const directions = Object.keys(directionsConfig).filter(
		(c: string) =>
			Object.keys(directionsConfig[c as ChainEnum]?.destChain || {})
				.length > 0,
	);
	return prepareChainsList(directions as ChainEnum[], settings);
};

export const isEvmChain = function (chain: ChainEnum): boolean {
	return (
		chain === ChainEnum.Nexus ||
		chain === ChainEnum.Base ||
		chain === ChainEnum.Bsc
	);
};

export const isLZBridging = function (
	originChain: ChainEnum,
	destinationChain: ChainEnum,
): boolean {
	const apexChains = new Set<string>(Object.values(ChainApexBridgeEnum));

	return (
		!apexChains.has(originChain as unknown as string) ||
		!apexChains.has(destinationChain as unknown as string)
	);
};

export const isCardanoChain = function (chain: ChainEnum): boolean {
	return (
		chain === ChainEnum.Prime ||
		chain === ChainEnum.Vector ||
		chain === ChainEnum.Cardano
	);
};

export const toChainEnum = function (value: string): ChainEnum {
	const lower = value.toLowerCase();
	if (Object.values(ChainEnum).includes(lower as ChainEnum)) {
		return lower as ChainEnum;
	}

	captureAndThrowError(`Invalid chain: ${value}`, 'chain.ts', 'toChainEnum');
};

export function isApexBridgeChain(chain: ChainEnum): boolean {
	switch (chain) {
		case ChainEnum.Prime:
		case ChainEnum.Vector:
		case ChainEnum.Nexus:
		case ChainEnum.Cardano:
			return true;
		default:
			return false; // sepolia / ethereum → false
	}
}

export function toApexBridge(
	chain: ChainEnum,
): ChainApexBridgeEnum | undefined {
	return isApexBridgeChain(chain)
		? (chain as unknown as ChainApexBridgeEnum)
		: undefined;
}

export function toLayerZeroChainName(chain: ChainEnum): string {
	switch (chain) {
		case ChainEnum.Nexus:
			return 'apexfusionnexus';
		default:
			return chain;
	}
}

export function toApexBridgeName(chain: string): ChainEnum {
	switch (chain) {
		case 'apexfusionnexus':
			return ChainEnum.Nexus;
		default:
			return chain as unknown as ChainEnum;
	}
}

export function getBridgingMode(
	settings: ISettingsState,
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	tokenID: number,
): BridgingModeWithSettings {
	for (const [key, value] of Object.entries(
		settings?.settingsPerMode || {},
	)) {
		if (
			srcChain in value.bridgingSettings.directionConfig &&
			dstChain in
				value.bridgingSettings.directionConfig[srcChain].destChain &&
			value.bridgingSettings.directionConfig[srcChain].destChain[
				dstChain
			].some(
				(x: BridgingSettingsTokenPairDto) => x.srcTokenID === tokenID,
			)
		) {
			return {
				settings: value,
				bridgingMode: key as unknown as BridgingModeEnum,
			};
		}
	}

	if (isLZBridging(srcChain, dstChain)) {
		return { bridgingMode: BridgingModeEnum.LayerZero };
	}

	return { bridgingMode: BridgingModeEnum.Unknown };
}
