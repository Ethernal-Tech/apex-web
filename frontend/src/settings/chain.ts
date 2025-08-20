import { ChainEnum } from "../swagger/apexBridgeApiService";
import { capitalizeWord, chainIcons } from "../utils/generalUtils";

type ChainInfo = {
    value: ChainEnum;
    label: string;
    icon: React.FunctionComponent;
    borderColor: string;
};

const chainInfoMapping: Partial<Record<ChainEnum, ChainInfo>> = {
    [ChainEnum.Prime]: {
        value: ChainEnum.Prime,
        label: capitalizeWord(ChainEnum.Prime),
        icon: chainIcons[ChainEnum.Prime],
        borderColor: '#077368'
    },
    [ChainEnum.Vector]: {
        value: ChainEnum.Vector,
        label: capitalizeWord(ChainEnum.Vector),
        icon: chainIcons[ChainEnum.Vector],
        borderColor: '#F25041'
    },
    [ChainEnum.Nexus]: {
        value: ChainEnum.Nexus,
        label: capitalizeWord(ChainEnum.Nexus),
        icon: chainIcons[ChainEnum.Nexus],
        borderColor: '#F27B50'
    },
    [ChainEnum.Cardano]: {
        value: ChainEnum.Cardano,
        label: capitalizeWord(ChainEnum.Cardano),
        icon: chainIcons[ChainEnum.Cardano],
        borderColor: '#0538AF'
    },
}

const reactorChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Vector, ChainEnum.Nexus],
    [ChainEnum.Vector]: [ChainEnum.Prime],
    [ChainEnum.Nexus]: [ChainEnum.Prime],
}

const skylineChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Cardano],
    [ChainEnum.Cardano]: [ChainEnum.Prime],
};

const getChainDirections = function (isSkyline: boolean): Partial<Record<ChainEnum, ChainEnum[]>> {
    if (isSkyline) {
        return skylineChainDirections;
    }
    return reactorChainDirections;
}

export const getChainInfo = function (chain: ChainEnum): ChainInfo {
    return chainInfoMapping[chain]!;
} 

export const getDstChains = function (isSkyline: boolean, chain: ChainEnum|undefined): ChainInfo[] {
    if (!chain) {
        return [];
    }

    const dirs = getChainDirections(isSkyline)[chain];
    if (!dirs) {
        return [];
    }

    return dirs.map(chain => chainInfoMapping[chain]).filter(x => x !== undefined) as ChainInfo[];
}

export const getSrcChains = function (isSkyline: boolean): ChainInfo[] {
    return Object.keys(getChainDirections(isSkyline)).map(chain => chainInfoMapping[chain as ChainEnum]!);
}