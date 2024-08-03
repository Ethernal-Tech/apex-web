import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const PRIME_NETWORK_ID = 0
const VECTOR_NETWORK_ID = 2
// const NEXUS_NETWORK_ID = BigInt(11155111) // TODO - this is for ethereum. Update later
const NEXUS_NETWORK_ID = BigInt(137) // TODO - this is for ethereum. Update later

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

const PRIME_EXPLORER_URL = 'https://prime-apex.ethernal.tech'
const VECTOR_EXPLORER_URL = 'https://vector-apex.ethernal.tech'

const getExplorerTxUrl = (chain: ChainEnum) => {
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

export const openExplorer = (tx: BridgeTransactionDto | undefined) => {
    if (!tx) {
        return;
    }

    if (tx.status === TransactionStatusEnum.ExecutedOnDestination && tx.destinationTxHash) {
        const baseUrl = getExplorerTxUrl(tx.destinationChain)
        window.open(`${baseUrl}/${tx.destinationTxHash}`, '_blank')
    } else if (tx.sourceTxHash) {
        const baseUrl = getExplorerTxUrl(tx.originChain)
        window.open(`${baseUrl}/${tx.sourceTxHash}`, '_blank')
    }
}