import { TokenEnum } from "../features/enums";
import appSettings from "../settings/appSettings";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const PRIME_NETWORK_ID = 0
const VECTOR_NETWORK_ID = 2
const CARDANO_NETWORK_ID = 0
const NEXUS_NETWORK_ID = BigInt(9070) // for Nexus

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
        case CARDANO_NETWORK_ID: {
            return ChainEnum.Cardano;
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
        case ChainEnum.Cardano: {
            return CARDANO_NETWORK_ID;
        }
        case ChainEnum.Nexus: {
            return NEXUS_NETWORK_ID;
        }
        default:
            return;
    }
}

export const checkChainCompatibility = (chain: ChainEnum, networkId: number|bigint): boolean => {
    return chain === fromNetworkIdToChain(networkId);
}

const PRIME_EXPLORER_URL = 'https://prime-apex.ethernal.tech'
const VECTOR_EXPLORER_URL = 'https://vector-apex.ethernal.tech'
const NEXUS_EXPLORER_URL = 'https://explorer.nexus.testnet.apexfusion.org'

const getExplorerTxUrl = (chain: ChainEnum) => {
    let url
    switch (chain) {
        case ChainEnum.Prime: {
            url = `${PRIME_EXPLORER_URL}/transaction/hash`;
            break;
        }
        case ChainEnum.Vector: {
            url = `${VECTOR_EXPLORER_URL}/transaction/hash`;
            break;
        }
        case ChainEnum.Nexus: {
            url = `${NEXUS_EXPLORER_URL}/tx`;
            break;
        }
        default:
            return;
    }

    return url;
}

export const openExplorer = (tx: BridgeTransactionDto | undefined) => {
    if (!tx) {
        return;
    }

    if (tx.status === TransactionStatusEnum.ExecutedOnDestination && tx.destinationTxHash) {
        const baseUrl = getExplorerTxUrl(tx.destinationChain)
        const txHash = tx.destinationChain === ChainEnum.Nexus && !tx.destinationTxHash.startsWith('0x')
            ? `0x${tx.destinationTxHash}` : tx.destinationTxHash;
        window.open(`${baseUrl}/${txHash}`, '_blank')
    } else if (tx.sourceTxHash) {
        const txHash = tx.originChain === ChainEnum.Nexus && !tx.sourceTxHash.startsWith('0x')
            ? `0x${tx.sourceTxHash}` : tx.sourceTxHash;
        const baseUrl = getExplorerTxUrl(tx.originChain)
        window.open(`${baseUrl}/${txHash}`, '_blank')
    }
}

export const fromChainToChainCurrency = (chain: ChainEnum): TokenEnum => {
    switch (chain) {
        case ChainEnum.Prime: {
            return TokenEnum.APEX;
        }
        case ChainEnum.Cardano: {
            return TokenEnum.Ada;
        }
        default:
            return TokenEnum.APEX;
    }
}

export const fromChainToChainNativeToken = (chain: ChainEnum): TokenEnum => {
    switch (chain) {
        case ChainEnum.Prime: {
            return TokenEnum.WAda;
        }
        case ChainEnum.Cardano: {
            return TokenEnum.WAPEX;
        }
        default:
            return TokenEnum.WAda;
    }
}

export const fromChainToCurrencySymbol = (chain: ChainEnum): string => {
    switch (chain) {
        default:
            return 'lovelace';
    }
}

export const fromChainToNativeTokenSymbol = (chain: ChainEnum): string => {
    return appSettings.wrappedTokenName[chain];
}

export const getIsNativeToken = (chain: ChainEnum, sourceToken: TokenEnum) => {
    if (chain === ChainEnum.Prime) {
        return sourceToken === TokenEnum.WAda;
    }

    return sourceToken === TokenEnum.WAPEX;
}

export const skylineChains: ChainEnum[] = [
    ChainEnum.Prime,
    ChainEnum.Cardano,
]

export const reactorChains: ChainEnum[] = [
    ChainEnum.Prime,
    ChainEnum.Vector,
    ChainEnum.Nexus,
]
