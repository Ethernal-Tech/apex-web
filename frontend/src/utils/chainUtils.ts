import { ChainEnum } from "../swagger/apexBridgeApiService";

const PRIME_NETWORK_ID = 0
const VECTOR_NETWORK_ID = 2

export const fromNetworkIdToChain = (networkId: number): ChainEnum | undefined => {
    switch (networkId) {
        case PRIME_NETWORK_ID: {
            return ChainEnum.Prime;
        }
        case VECTOR_NETWORK_ID: {
            return ChainEnum.Vector;
        }
        default:
            return;
    }
}

export const fromChainToNetworkId = (chain: ChainEnum): number | undefined => {
    switch (chain) {
        case ChainEnum.Prime: {
            return PRIME_NETWORK_ID;
        }
        case ChainEnum.Vector: {
            return VECTOR_NETWORK_ID;
        }
        default:
            return;
    }
}

export const areChainsEqual = (chain: ChainEnum, networkId: number): boolean => {
    return chain === fromNetworkIdToChain(networkId);
}

const PRIME_EXPLORER_URL = 'https://prime-apex.ethernal.tech'
const VECTOR_EXPLORER_URL = 'https://vector-apex.ethernal.tech'

export const getExplorerTxUrl = (chain: ChainEnum) => {
    let baseUrl
    switch (chain) {
        case ChainEnum.Prime: {
            baseUrl = PRIME_EXPLORER_URL;
            break;
        }
        case ChainEnum.Vector: {
            baseUrl = VECTOR_EXPLORER_URL;
            break;
        }
        default:
            return;
    }

    return `${baseUrl}/transaction/hash`;
}