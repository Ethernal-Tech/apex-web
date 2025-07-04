import { CardanoAddress } from "../features/Address/interfaces";
import { CardanoNetworkType } from "../features/Address/types";
import { ApexBridgeNetwork } from "../features/enums";
import appSettings from "../settings/appSettings";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9070); // TODO: CHANGE WHEN WE FIND OUT

type ChainData = {
    mainnet: { networkID: number|bigint, network: ApexBridgeNetwork },
    testnet: { networkID: number|bigint, network: ApexBridgeNetwork },
}

const CHAIN_DATA: {[key: string]: ChainData} = {
    [ChainEnum.Prime]: {
        mainnet: {
            networkID: CardanoNetworkType.MainNetNetwork,
            network: ApexBridgeNetwork.MainnetPrime,
        },
        testnet: {
            networkID: CardanoNetworkType.TestNetNetwork,
            network: ApexBridgeNetwork.TestnetPrime,
        },
    },
    [ChainEnum.Vector]:  {
        mainnet: {
            networkID: CardanoNetworkType.VectorMainNetNetwork,
            network: ApexBridgeNetwork.MainnetVector,
        },
        testnet: {
            networkID: CardanoNetworkType.VectorTestNetNetwork,
            network: ApexBridgeNetwork.TestnetVector,
        },
    },
    [ChainEnum.Nexus]:  {
        mainnet: {
            networkID: NEXUS_MAINNET_CHAIN_ID,
            network: ApexBridgeNetwork.MainnetNexus,
        },
        testnet: {
            networkID: NEXUS_TESTNET_CHAIN_ID,
            network: ApexBridgeNetwork.TestnetNexus,
        },
    },
}

const NETWORK_TO_CHAIN: {mainnet: {[key: string]: ChainEnum}, testnet: {[key: string]: ChainEnum}} = {
    mainnet: {
        [ApexBridgeNetwork.MainnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.MainnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.MainnetNexus]: ChainEnum.Nexus,
    },
    testnet: {
        [ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
    }
}

export const fromChainToNetwork = (chain: ChainEnum): ApexBridgeNetwork | undefined => {
    return appSettings.isMainnet ? CHAIN_DATA[chain]?.mainnet?.network : CHAIN_DATA[chain]?.testnet?.network;
} 

export const fromNetworkToChain = (network: ApexBridgeNetwork): ChainEnum | undefined => {
    return appSettings.isMainnet ? NETWORK_TO_CHAIN.mainnet[network] : NETWORK_TO_CHAIN.testnet[network];
} 

export const fromChainToNetworkId = (chain: ChainEnum): number | bigint | undefined => {
    return appSettings.isMainnet ? CHAIN_DATA[chain]?.mainnet?.networkID : CHAIN_DATA[chain]?.testnet?.networkID;
}

export const fromEvmNetworkIdToNetwork = (networkId: bigint): ApexBridgeNetwork | undefined => {
    return appSettings.isMainnet
        ? (networkId === NEXUS_MAINNET_CHAIN_ID ? ApexBridgeNetwork.MainnetNexus : undefined)
        : (networkId === NEXUS_TESTNET_CHAIN_ID ? ApexBridgeNetwork.TestnetNexus : undefined);
}

export const checkChainCompatibility = (chain: ChainEnum, network: ApexBridgeNetwork, networkId: number|bigint): boolean => {
    return fromChainToNetworkId(chain) === networkId && fromNetworkToChain(network) === chain;
}

export const checkCardanoAddressCompatibility = (chain: ChainEnum, addr: CardanoAddress): boolean => {
    return fromChainToNetworkId(chain) === addr.GetNetwork();
}

// TODO: will need to add explorer urls for mainnet
const EXPLORER_URLS: {mainnet: {[key: string]: string}, testnet: {[key: string]: string}} = {
    mainnet: {
        [ChainEnum.Prime]: 'https://prime-apex.ethernal.tech',
        [ChainEnum.Vector]: 'https://vector-apex.ethernal.tech',
        [ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
    },
    testnet: {
        [ChainEnum.Prime]: 'https://prime-apex.ethernal.tech',
        [ChainEnum.Vector]: 'https://vector-apex.ethernal.tech',
        [ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
    },
}

const getExplorerTxUrl = (chain: ChainEnum) => {
    const base = appSettings.isMainnet ? EXPLORER_URLS.mainnet[chain] : EXPLORER_URLS.testnet[chain];
    
    let url
    switch (chain) {
        case ChainEnum.Vector:
        case ChainEnum.Prime: {
            url = `${base}/transaction/hash`;
            break;
        }
        case ChainEnum.Nexus: {
            url = `${base}/tx`;
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