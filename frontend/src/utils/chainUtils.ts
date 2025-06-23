import { CardanoAddress } from "../features/Address/interfaces";
import { CardanoNetworkType } from "../features/Address/types";
import { ApexBridgeNetwork, TokenEnum } from "../features/enums";
import appSettings from "../settings/appSettings";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const TESTNET_NEXUS_NETWORK_ID = BigInt(9070) // for Nexus
const MAINNET_NEXUS_NETWORK_ID = BigInt(9071) // TODO: fix when known

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
            networkID: MAINNET_NEXUS_NETWORK_ID,
            network: ApexBridgeNetwork.MainnetNexus,
        },
        testnet: {
            networkID: TESTNET_NEXUS_NETWORK_ID,
            network: ApexBridgeNetwork.TestnetNexus,
        },
    },
    [ChainEnum.Cardano]:  {
        mainnet: {
            networkID: CardanoNetworkType.MainNetNetwork,
            network: ApexBridgeNetwork.MainnetCardano,
        },
        testnet: {
            networkID: CardanoNetworkType.TestNetNetwork,
            network: ApexBridgeNetwork.PreviewCardano,
        },
    },
}

const NETWORK_TO_CHAIN: {mainnet: {[key: string]: ChainEnum}, testnet: {[key: string]: ChainEnum}} = {
    mainnet: {
        [ApexBridgeNetwork.MainnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.MainnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.MainnetNexus]: ChainEnum.Nexus,
        [ApexBridgeNetwork.MainnetCardano]: ChainEnum.Cardano,

    },
    testnet: {
        [ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
        [ApexBridgeNetwork.PreviewCardano]: ChainEnum.Cardano,
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
        ? (networkId === MAINNET_NEXUS_NETWORK_ID ? ApexBridgeNetwork.MainnetNexus : undefined)
        : (networkId === TESTNET_NEXUS_NETWORK_ID ? ApexBridgeNetwork.TestnetNexus : undefined);
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
        [ChainEnum.Cardano]: 'https://preview.cardanoscan.io',
    },
    testnet: {
        [ChainEnum.Prime]: 'https://prime-apex.ethernal.tech',
        [ChainEnum.Vector]: 'https://vector-apex.ethernal.tech',
        [ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
        [ChainEnum.Cardano]: 'https://preview.cardanoscan.io',
    },
}

export const chainSupported = (chain: ChainEnum): boolean => {
    return appSettings.isSkyline
        ? skylineChains.includes(chain)
        : reactorChains.includes(chain);
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
        case ChainEnum.Cardano: {
            url = `${base}/transaction`;
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

export const TokenEnumToLabel: Record<TokenEnum, string> = {
  [TokenEnum.Ada]: 'ADA',
  [TokenEnum.WAda]: 'wADA',
  [TokenEnum.APEX]: 'AP3X',
  [TokenEnum.WAPEX]: 'cAP3X', 
};