import { SVGProps } from "react";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { ReactComponent as CardanoIcon } from '../assets/chain-icons/cardano.svg';

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
    value: ChainEnum;
    label: string;
    icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
    letter: string;
    mainColor: string;
    borderColor: string;
};

const unknownChainInfo: ChainInfo = {
    value: ChainEnum.Prime,
    label: '',
    icon: PrimeIcon,
    letter: '',
    mainColor: 'transparent',
    borderColor: 'transparent'
}

const chainInfoMapping: Partial<Record<ChainEnum, ChainInfo>> = {
    [ChainEnum.Prime]: {
        value: ChainEnum.Prime,
        label: "Prime",
        icon: PrimeIcon,
        borderColor: '#077368',
        letter: 'P',
        mainColor: '#077368'
    },
    [ChainEnum.Vector]: {
        value: ChainEnum.Vector,
        label: "Vector",
        icon: VectorIcon,
        borderColor: '#F25041',
        letter: 'V',
        mainColor: '#F25041'
    },
    [ChainEnum.Nexus]: {
        value: ChainEnum.Nexus,
        label: "Nexus",
        icon: NexusIcon,
        borderColor: '#F27B50',
        letter: 'N',
        mainColor: '#F27B50'
    },
    [ChainEnum.Cardano]: {
        value: ChainEnum.Cardano,
        label: "Cardano",
        icon: CardanoIcon,
        borderColor: '#0538AF',
        letter: 'C',
        mainColor: '#0538AF'
    },
}

const getChainDirections = function (isSkyline: boolean): Partial<Record<ChainEnum, ChainEnum[]>> {
    if (isSkyline) {
        return skylineChainDirections;
    }
    return reactorChainDirections;
}

export const getChainInfo = function (chain: ChainEnum): ChainInfo {
    return chainInfoMapping[chain] || unknownChainInfo;
}

export const getDstChains = function (isSkyline: boolean, chain: ChainEnum | undefined): ChainEnum[] {
    if (!chain) {
        return [];
    }

    return getChainDirections(isSkyline)[chain] || [];
}

export const getSrcChains = function (isSkyline: boolean): ChainEnum[] {
    return Object.keys(getChainDirections(isSkyline)) as ChainEnum[];
}

export const isEvmChain = function (chain: ChainEnum): boolean {
    return chain === ChainEnum.Nexus;
}

export const isCardanoChain = function (chain: ChainEnum): boolean {
    return chain === ChainEnum.Prime || chain === ChainEnum.Vector || chain === ChainEnum.Cardano;
}