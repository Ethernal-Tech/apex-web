import { SVGProps } from "react";
import { ChainApexBridgeEnum, ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as PrimeIcon } from '../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../assets/chain-icons/nexus.svg';
import { ReactComponent as CardanoIcon } from '../assets/chain-icons/cardano.svg';
import {ReactComponent as BaseIcon} from '../assets/chain-icons/base.svg'
import {ReactComponent as BNBIcon} from '../assets/chain-icons/bsc.svg'
import { TokenEnum } from "../features/enums";
import appSettings from "./appSettings";

const reactorChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Vector, ChainEnum.Nexus],
    [ChainEnum.Vector]: [ChainEnum.Prime],
    [ChainEnum.Nexus]: [ChainEnum.Prime],
}

const skylineChainDirections: Partial<Record<ChainEnum, ChainEnum[]>> = {
    [ChainEnum.Prime]: [ChainEnum.Cardano],
    [ChainEnum.Cardano]: [ChainEnum.Prime],
    [ChainEnum.Nexus]: [ChainEnum.Base, ChainEnum.Bsc],
    [ChainEnum.Base]: [ChainEnum.Nexus, ChainEnum.Bsc],
    [ChainEnum.Bsc]: [ChainEnum.Nexus, ChainEnum.Base]
};

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
    [ChainEnum.Cardano]: {
        value: ChainEnum.Cardano,
        currencyToken: TokenEnum.Ada,
        label: "Cardano",
        icon: CardanoIcon,
        borderColor: '#0538AF',
        letter: 'C',
        mainColor: '#0538AF'
    },
    [ChainEnum.Base]: {
        value: ChainEnum.Base,
        currencyToken: TokenEnum.ETH,
        label: "Base",
        icon: BaseIcon,
        borderColor: '#0052FF',
        letter: 'B',
        mainColor: '#0052FF'
    },
    [ChainEnum.Bsc]: {
        value: ChainEnum.Bsc,
        currencyToken: TokenEnum.BNB,
        label: "BNB Smart Chain",
        icon: BNBIcon,
        borderColor: '#F3BA2F',
        letter: 'B',
        mainColor: '#F3BA2F'
    },
}

const getChainDirections = function (): Partial<Record<ChainEnum, ChainEnum[]>> {
    return appSettings.isSkyline ? skylineChainDirections : reactorChainDirections;
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
    return chain === ChainEnum.Nexus || chain === ChainEnum.Base || chain === ChainEnum.Bsc;
}

export const isLZBridging = function (originChain: ChainEnum, destinationChain: ChainEnum): boolean {
  const apexChains = new Set<string>(Object.values(ChainApexBridgeEnum));

  return !apexChains.has(originChain as unknown as string) ||
         !apexChains.has(destinationChain as unknown as string);
};

export const isCardanoChain = function (chain: ChainEnum): boolean {
    return chain === ChainEnum.Prime || chain === ChainEnum.Vector || chain === ChainEnum.Cardano;
}

export const toChainEnum = function (value: string): ChainEnum {
    const lower = value.toLowerCase();
    if (Object.values(ChainEnum).includes(lower as ChainEnum)) {
        return lower as ChainEnum;
    }

    throw new Error(`Invalid chain: ${value}`);
}

export function isApexBridgeChain(
  chain: ChainEnum
): boolean {
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
  chain: ChainEnum
): ChainApexBridgeEnum | undefined {
  return isApexBridgeChain(chain) ? (chain as unknown as ChainApexBridgeEnum) : undefined;
}

export function isLZWrappedChain(chain: ChainEnum): boolean{
    return chain === ChainEnum.Base || chain === ChainEnum.Bsc
}

export function toLayerZeroChainName(chain: ChainEnum): string{
    switch (chain){
    case ChainEnum.Nexus:
        return 'apexfusionnexus'
    default:
        return chain
    }
}

export function toApexBridgeName(chain: string): ChainEnum{
    switch (chain){
        case 'apexfusionnexus':
            return ChainEnum.Nexus
        default: 
            return chain as unknown as ChainEnum
    }
}
