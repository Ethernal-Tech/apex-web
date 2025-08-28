import { SVGProps } from "react";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { ReactComponent as CardanoIcon } from '../assets/chain-icons/cardano.svg';
import { TokenEnum } from "../features/enums";
import appSettings from "./appSettings";

export const ChainExtended = {
  ...ChainEnum,
  Ethereum: "ethereum",
} as const;

export type ChainExtendedEnum = typeof ChainExtended[keyof typeof ChainExtended];

const reactorChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Vector, ChainEnum.Nexus],
    [ChainEnum.Vector]: [ChainEnum.Prime],
    [ChainEnum.Nexus]: [ChainEnum.Prime],
}

const skylineChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Cardano],
    [ChainEnum.Cardano]: [ChainEnum.Prime],
};

export type ChainInfo = {
    value: ChainExtendedEnum;
    currencyToken: TokenEnum,
    label: string;
    icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
    letter: string;
    mainColor: string;
    borderColor: string;
};

const unknownChainInfo: ChainInfo = {
    value: ChainEnum.Prime,
    currencyToken: TokenEnum.APEX,
    label: '',
    icon: PrimeIcon,
    letter: '',
    mainColor: 'transparent',
    borderColor: 'transparent'
}

const chainInfoMapping: Partial<Record<ChainExtendedEnum, ChainInfo>> = {
    [ChainEnum.Prime]: {
        value: ChainEnum.Prime,
        currencyToken: TokenEnum.APEX,
        label: "Prime",
        icon: PrimeIcon,
        borderColor: '#077368',
        letter: 'P',
        mainColor: '#077368'
    },
    [ChainEnum.Vector]: {
        value: ChainEnum.Vector,
        currencyToken: TokenEnum.APEX,
        label: "Vector",
        icon: VectorIcon,
        borderColor: '#F25041',
        letter: 'V',
        mainColor: '#F25041'
    },
    [ChainEnum.Nexus]: {
        value: ChainEnum.Nexus,
        currencyToken: TokenEnum.APEX,
        label: "Nexus",
        icon: NexusIcon,
        borderColor: '#F27B50',
        letter: 'N',
        mainColor: '#F27B50'
    },
    [ChainEnum.Cardano]: {
        value: ChainEnum.Cardano,
        currencyToken: TokenEnum.Ada,
        label: "Cardano",
        icon: CardanoIcon,
        borderColor: '#0538AF',
        letter: 'C',
        mainColor: '#0538AF'
    },
    [ChainExtended.Ethereum]: {
        value: ChainExtended.Ethereum,
        currencyToken: TokenEnum.ETH,
        label: "Ethereum",
        icon: VectorIcon, // TODO: Change icon to Ethereum
        borderColor: '#647cf6',
        letter: 'E',
        mainColor: '#647cf6'
    },
}

const getChainDirections = function (): Partial<Record<ChainExtendedEnum, ChainExtendedEnum[]>> {
    return appSettings.isSkyline ? skylineChainDirections : reactorChainDirections;
}

export const getChainInfo = function (chain: ChainExtendedEnum): ChainInfo {
    return chainInfoMapping[chain] || unknownChainInfo;
}

export const getDstChains = function (chain: ChainExtendedEnum | undefined): ChainExtendedEnum[] {
    if (!chain) {
        return [];
    }

    return getChainDirections()[chain] || [];
}

export const getSrcChains = function (): ChainEnum[] {
    return Object.keys(getChainDirections()) as ChainEnum[];
}

export const isEvmChain = function (chain: ChainExtendedEnum): boolean {
    return chain === ChainEnum.Nexus;
}

export const isCardanoChain = function (chain: ChainExtendedEnum): boolean {
    return chain === ChainEnum.Prime || chain === ChainEnum.Vector || chain === ChainEnum.Cardano;
}

export const toChainEnum = function (value: string): ChainEnum {
    const lower = value.toLowerCase();
    if (Object.values(ChainEnum).includes(lower as ChainEnum)) {
        return lower as ChainEnum;
    }

    throw new Error(`Invalid chain: ${value}`);
}