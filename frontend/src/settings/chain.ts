import { SVGProps } from 'react';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { TokenEnum } from '../features/enums';
import { ISettingsState } from '../redux/slices/settingsSlice';

export type ChainInfo = {
	value: ChainEnum;
	currencyToken: TokenEnum;
	label: string;
	icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
	letter: string;
	mainColor: string;
	borderColor: string;
	order: number;
};

const unknownChainInfo: ChainInfo = {
	value: ChainEnum.Prime,
	currencyToken: TokenEnum.APEX,
	label: '',
	icon: PrimeIcon,
	letter: '',
	mainColor: 'transparent',
	borderColor: 'transparent',
	order: 100,
};

const chainInfoMapping: Partial<Record<ChainEnum, ChainInfo>> = {
	[ChainEnum.Prime]: {
		value: ChainEnum.Prime,
		currencyToken: TokenEnum.APEX,
		label: 'Prime',
		icon: PrimeIcon,
		borderColor: '#077368',
		letter: 'P',
		mainColor: '#077368',
		order: 1,
	},
	[ChainEnum.Vector]: {
		value: ChainEnum.Vector,
		currencyToken: TokenEnum.APEX,
		label: 'Vector',
		icon: VectorIcon,
		borderColor: '#F25041',
		letter: 'V',
		mainColor: '#F25041',
		order: 3,
	},
	[ChainEnum.Nexus]: {
		value: ChainEnum.Nexus,
		currencyToken: TokenEnum.APEX,
		label: 'Nexus',
		icon: NexusIcon,
		borderColor: '#F27B50',
		letter: 'N',
		mainColor: '#F27B50',
		order: 4,
	},
};

// currently just returns allowedDirections from settings. On feat/skyline it is more complicated
const getChainDirections = function (
	settings: ISettingsState,
): Partial<Record<ChainEnum, ChainEnum[]>> {
	return settings.allowedDirections;
};

const prepareChainsList = function (
	chains: ChainEnum[] | undefined,
	settings: ISettingsState,
): ChainEnum[] {
	return (chains || [])
		.filter((x) => settings.enabledChains.includes(x))
		.sort((a, b) => getChainInfo(a).order - getChainInfo(b).order);
};

export const getDstChains = function (
	chain: ChainEnum | undefined,
	settings: ISettingsState,
): ChainEnum[] {
	if (!chain) {
		return [];
	}

	return prepareChainsList(getChainDirections(settings)[chain], settings);
};

export const getSrcChains = function (settings: ISettingsState): ChainEnum[] {
	return prepareChainsList(
		Object.keys(getChainDirections(settings)) as ChainEnum[],
		settings,
	);
};

export const getChainInfo = function (chain: ChainEnum): ChainInfo {
	return chainInfoMapping[chain] || unknownChainInfo;
};

export const isEvmChain = function (chain: ChainEnum): boolean {
	return chain === ChainEnum.Nexus;
};

export const isCardanoChain = function (chain: ChainEnum): boolean {
	return chain === ChainEnum.Prime || chain === ChainEnum.Vector;
};
