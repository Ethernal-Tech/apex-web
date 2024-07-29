import { ChainEnum } from "../swagger/apexBridgeApiService";

const PRIME_NETWORK_ID = 0
const VECTOR_NETWORK_ID = 2
const NEXUS_NETWORK_ID = BigInt(11155111) // TODO - this is for ethereum. Update later

export const fromNetworkIdToChain = (networkId: number|bigint): ChainEnum | undefined => {
    switch (networkId) {
        case PRIME_NETWORK_ID: {
            return ChainEnum.Prime;
        }
        case VECTOR_NETWORK_ID: {
            return ChainEnum.Vector;
        }
        case NEXUS_NETWORK_ID: {
            return ChainEnum.Nexus;
        }
        default:
            return;
    }
}

export const fromChainToNetworkId = (chain: ChainEnum): number | bigint | undefined => {
    switch (chain) {
        case ChainEnum.Prime: {
            return PRIME_NETWORK_ID;
        }
        case ChainEnum.Vector: {
            return VECTOR_NETWORK_ID;
        }
        case ChainEnum.Nexus: {
            return NEXUS_NETWORK_ID;
        }
        default:
            return;
    }
}

export const areChainsEqual = (chain: ChainEnum, networkId: number|bigint): boolean => {
    return chain === fromNetworkIdToChain(networkId);
}