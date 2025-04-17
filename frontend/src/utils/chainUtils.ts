import { CardanoAddress } from "../features/Address/interfaces";
import { ApexBridgeNetwork, TokenEnum } from "../features/enums";
import appSettings from "../settings/appSettings";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const TESTNET_PRIME_NETWORK_ID = 0
const TESTNET_VECTOR_NETWORK_ID = 2
const PREVIEW_CARDANO_NETWORK_ID = 0
const TESTNET_NEXUS_NETWORK_ID = BigInt(9070) // for Nexus

const MAINNET_PRIME_NETWORK_ID = 1
const MAINNET_VECTOR_NETWORK_ID = 3
const MAINNET_CARDANO_NETWORK_ID = 1
const MAINNET_NEXUS_NETWORK_ID = BigInt(9071) // TODO: fix when known

const CHAIN_TO_TESTNET_NETWORK_ID = {
    [ChainEnum.Prime]: TESTNET_PRIME_NETWORK_ID,
    [ChainEnum.Vector]: TESTNET_VECTOR_NETWORK_ID,
    [ChainEnum.Nexus]: TESTNET_NEXUS_NETWORK_ID,
    [ChainEnum.Cardano]: PREVIEW_CARDANO_NETWORK_ID,
}

const CHAIN_TO_MAINNET_NETWORK_ID = {
    [ChainEnum.Prime]: MAINNET_PRIME_NETWORK_ID,
    [ChainEnum.Vector]: MAINNET_VECTOR_NETWORK_ID,
    [ChainEnum.Nexus]: MAINNET_NEXUS_NETWORK_ID,
    [ChainEnum.Cardano]: MAINNET_CARDANO_NETWORK_ID,
}

const CHAIN_TO_TESTNET_NETWORK = {
    [ChainEnum.Prime]: ApexBridgeNetwork.TestnetPrime,
    [ChainEnum.Vector]: ApexBridgeNetwork.TestnetVector,
    [ChainEnum.Nexus]: ApexBridgeNetwork.TestnetNexus,
    [ChainEnum.Cardano]: ApexBridgeNetwork.PreviewCardano,
}

const CHAIN_TO_MAINNET_NETWORK = {
    [ChainEnum.Prime]: ApexBridgeNetwork.MainnetPrime,
    [ChainEnum.Vector]: ApexBridgeNetwork.MainnetVector,
    [ChainEnum.Nexus]: ApexBridgeNetwork.MainnetNexus,
    [ChainEnum.Cardano]: ApexBridgeNetwork.MainnetCardano,
}

const TESTNET_NETWORK_TO_CHAIN: {[key: string]: ChainEnum} = {
    [ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
    [ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
    [ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
    [ApexBridgeNetwork.PreviewCardano]: ChainEnum.Cardano,
}

const MAINNET_NETWORK_TO_CHAIN: {[key: string]: ChainEnum} = {
    [ApexBridgeNetwork.MainnetPrime]: ChainEnum.Prime,
    [ApexBridgeNetwork.MainnetVector]: ChainEnum.Vector,
    [ApexBridgeNetwork.MainnetNexus]: ChainEnum.Nexus,
    [ApexBridgeNetwork.MainnetCardano]: ChainEnum.Cardano,
}

export const fromChainToNetwork = (chain: ChainEnum): ApexBridgeNetwork | undefined => {
    return appSettings.isMainnet ? CHAIN_TO_MAINNET_NETWORK[chain] : CHAIN_TO_TESTNET_NETWORK[chain];
} 

export const fromNetworkToChain = (network: ApexBridgeNetwork): ChainEnum | undefined => {
    return appSettings.isMainnet ? MAINNET_NETWORK_TO_CHAIN[network] : TESTNET_NETWORK_TO_CHAIN[network];
} 

export const fromChainToNetworkId = (chain: ChainEnum): number | bigint | undefined => {
    return appSettings.isMainnet ? CHAIN_TO_MAINNET_NETWORK_ID[chain] : CHAIN_TO_TESTNET_NETWORK_ID[chain];
}

export const fromNexusNetworkIdToNetwork = (networkId: bigint): ApexBridgeNetwork | undefined => {
    return appSettings.isMainnet
        ? (networkId === MAINNET_NEXUS_NETWORK_ID ? ApexBridgeNetwork.MainnetNexus : undefined)
        : (networkId === TESTNET_NEXUS_NETWORK_ID ? ApexBridgeNetwork.TestnetNexus : undefined);
}

export const checkChainCompatibility = (chain: ChainEnum, network: ApexBridgeNetwork, networkId: number|bigint): boolean => {
    return fromChainToNetworkId(chain) === networkId && fromNetworkToChain(network) === chain;
}

export const checkCardanoAddressCompatibility = (chain: ChainEnum, addr: CardanoAddress): boolean => {
    return fromChainToNetworkId(chain) === addr.GetNetwork();
}

export const chainSupported = (chain: ChainEnum): boolean => {
    return appSettings.isSkyline
        ? skylineChains.includes(chain)
        : reactorChains.includes(chain);
}

const PRIME_EXPLORER_URL = 'https://prime-apex.ethernal.tech'
const VECTOR_EXPLORER_URL = 'https://vector-apex.ethernal.tech'
const NEXUS_EXPLORER_URL = 'https://explorer.nexus.testnet.apexfusion.org'
const CARDANO_EXPLORER_URL = 'https://preview.cardanoscan.io'

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
        case ChainEnum.Cardano: {
            url = `${CARDANO_EXPLORER_URL}/transaction`;
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
