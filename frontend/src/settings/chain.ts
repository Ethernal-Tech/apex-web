import { SVGProps } from "react";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { TokenEnum } from "../features/enums";

const reactorChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Vector, ChainEnum.Nexus],
    [ChainEnum.Vector]: [ChainEnum.Prime, ChainEnum.Nexus],
    [ChainEnum.Nexus]: [ChainEnum.Prime, ChainEnum.Vector],
}

export type ChainInfo = {
    value: ChainEnum;
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

const chainInfoMapping: Partial<Record<ChainEnum, ChainInfo>> = {
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
}

const getChainDirections = function (): Partial<Record<ChainEnum, ChainEnum[]>> {
    return reactorChainDirections;
}

export const getChainInfo = function (chain: ChainEnum): ChainInfo {
    return chainInfoMapping[chain] || unknownChainInfo;
}

export const getDstChains = function (chain: ChainEnum | undefined): ChainEnum[] {
    if (!chain) {
        return [];
    }

    return getChainDirections()[chain] || [];
}

export const getSrcChains = function (): ChainEnum[] {
    return Object.keys(getChainDirections()) as ChainEnum[];
}

export const isEvmChain = function (chain: ChainEnum): boolean {
    return chain === ChainEnum.Nexus;
}

export const isCardanoChain = function (chain: ChainEnum): boolean {
    return chain === ChainEnum.Prime || chain === ChainEnum.Vector;
}

export const toChainEnum = function (value: string): ChainEnum {
    const lower = value.toLowerCase();
    if (Object.values(ChainEnum).includes(lower as ChainEnum)) {
        return lower as ChainEnum;
    }

    throw new Error(`Invalid chain: ${value}`);
}