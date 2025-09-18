import { CardanoAddress } from "../features/Address/interfaces";
import { CardanoNetworkType } from "../features/Address/types";
import { ApexBridgeNetwork } from "../features/enums";
import appSettings from "../settings/appSettings";
import { isEvmChain } from "../settings/chain";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const TESTNET_NEXUS_NETWORK_ID = BigInt(9070) // for Nexus testnet
const MAINNET_NEXUS_NETWORK_ID = BigInt(9069) // for Nexus mainnet

const MAINNET_BASE_NETWORK_ID = BigInt(8453) // for Base mainnet
const TESTNET_BASE_NETWORK_ID = BigInt(84532) // for Base testnet

const MAINNET_BSC_NETWORK_ID = BigInt(56) // for BNB Smart Chain mainnet
const TESTNET_BSC_NETWORK_ID = BigInt(97) // for BNB Smart Chain testnet(check for this)

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
    [ChainEnum.Base]: {
        mainnet:{
            networkID: MAINNET_BASE_NETWORK_ID,
            network: ApexBridgeNetwork.MainnetBase
        }, 
        testnet: {
            networkID: TESTNET_BASE_NETWORK_ID,
            network: ApexBridgeNetwork.TestnetBase
        }
    },
    [ChainEnum.Bsc]: {
        mainnet:{
            networkID: MAINNET_BSC_NETWORK_ID,
            network: ApexBridgeNetwork.MainnetBsc
        }, 
        testnet: {
            networkID: TESTNET_BSC_NETWORK_ID,
            network: ApexBridgeNetwork.TestnetBsc
        }
    }
}

const NETWORK_TO_CHAIN: {mainnet: {[key: string]: ChainEnum}, testnet: {[key: string]: ChainEnum}} = {
    mainnet: {
        [ApexBridgeNetwork.MainnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.MainnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.MainnetNexus]: ChainEnum.Nexus,
        [ApexBridgeNetwork.MainnetCardano]: ChainEnum.Cardano,
        [ApexBridgeNetwork.MainnetBase]: ChainEnum.Base,
        [ApexBridgeNetwork.MainnetBsc]: ChainEnum.Bsc

    },
    testnet: {
        [ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
        [ApexBridgeNetwork.PreviewCardano]: ChainEnum.Cardano,
        [ApexBridgeNetwork.TestnetBase]: ChainEnum.Base,
        [ApexBridgeNetwork.TestnetBsc]: ChainEnum.Bsc
    }
}

export const fromChainToNetwork = (chain: ChainEnum, useMainnet: boolean): ApexBridgeNetwork | undefined => {
    return useMainnet ? CHAIN_DATA[chain]?.mainnet?.network : CHAIN_DATA[chain]?.testnet?.network;
} 

export const fromNetworkToChain = (network: string, useMainnet: boolean): ChainEnum | undefined => {
    return useMainnet ? NETWORK_TO_CHAIN.mainnet[network] : NETWORK_TO_CHAIN.testnet[network];
} 

export const fromChainToNetworkId = (chain: ChainEnum, useMainnet: boolean): number | bigint | undefined => {
    return useMainnet ? CHAIN_DATA[chain]?.mainnet?.networkID : CHAIN_DATA[chain]?.testnet?.networkID;
}

export const fromEvmNetworkIdToNetwork = (
  networkId: bigint, useMainnet: boolean,
): ApexBridgeNetwork | undefined => {
  if (useMainnet) {
    if (networkId === MAINNET_NEXUS_NETWORK_ID) {
      return ApexBridgeNetwork.MainnetNexus;
    }
    if (networkId === MAINNET_BASE_NETWORK_ID) {
      return ApexBridgeNetwork.MainnetBase;
    }
    if (networkId === MAINNET_BSC_NETWORK_ID) {
        return ApexBridgeNetwork.MainnetBsc
    }
  } else {
    if (networkId === TESTNET_NEXUS_NETWORK_ID) {
      return ApexBridgeNetwork.TestnetNexus;
    }
    if (networkId === TESTNET_BASE_NETWORK_ID) {
      return ApexBridgeNetwork.TestnetBase;
    }
    if (networkId === TESTNET_BSC_NETWORK_ID) {
        return ApexBridgeNetwork.TestnetBsc
    }
  }
  return undefined;
};

export const checkChainCompatibility = (chain: ChainEnum, network: string, networkId: number|bigint, useMainnet: boolean): boolean => {
    return fromChainToNetworkId(chain, useMainnet) === networkId && fromNetworkToChain(network, useMainnet) === chain;
}

export const checkCardanoAddressCompatibility = (chain: ChainEnum, addr: CardanoAddress, useMainnet: boolean): boolean => {
    return fromChainToNetworkId(chain, useMainnet) === addr.GetNetwork();
}

// TODO: will need to add explorer urls for nexus mainnet
const EXPLORER_URLS: {mainnet: {[key: string]: string}, testnet: {[key: string]: string}} = {
    mainnet: {
        [ChainEnum.Prime]: 'https://apexscan.org/en',
        [ChainEnum.Vector]: 'https://vector-apex.ethernal.tech',
        [ChainEnum.Nexus]: 'https://explorer.nexus.mainnet.apexfusion.org',
        [ChainEnum.Cardano]: 'https://cardanoscan.io',
    },
    testnet: {
        [ChainEnum.Prime]: 'https://explorer.prime.testnet.apexfusion.org',
        [ChainEnum.Vector]: 'https://vector-apex.ethernal.tech',
        [ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
        [ChainEnum.Cardano]: 'https://preview.cardanoscan.io',
    },
}

const getExplorerTxUrl = (chain: ChainEnum, txHash: string, isLZBridging?: boolean) => {
    if (isLZBridging) {
        return `https://layerzeroscan.com/tx/${txHash}`
    }

    const base = appSettings.isMainnet ? EXPLORER_URLS.mainnet[chain] : EXPLORER_URLS.testnet[chain];

    let url
    switch (chain) {
        case ChainEnum.Vector:
        case ChainEnum.Prime: {
            url = appSettings.isMainnet
                ? `${base}/transaction/${txHash}/summary/`
                : `${base}/transaction/hash/${txHash}`;
            break;
        }
        case ChainEnum.Base:
        case ChainEnum.Nexus: {
            url = `${base}/tx/${txHash}`;
            break;
        }
        case ChainEnum.Cardano: {
            url = `${base}/transaction/${txHash}`;
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

    if (tx.isLayerZero){
        const url = getExplorerTxUrl(tx.originChain, tx.sourceTxHash, true)
        window.open(url, '_blank')
        return
    }

    if (tx.status === TransactionStatusEnum.ExecutedOnDestination && tx.destinationTxHash) {
        const txHash = isEvmChain(tx.destinationChain) && !tx.destinationTxHash.startsWith('0x')
        ? `0x${tx.destinationTxHash}` : tx.destinationTxHash;
        const url = getExplorerTxUrl(tx.destinationChain, txHash)
        window.open(url, '_blank')
    } else if (tx.sourceTxHash) {
        const txHash = isEvmChain(tx.originChain) && !tx.sourceTxHash.startsWith('0x')
            ? `0x${tx.sourceTxHash}` : tx.sourceTxHash;
        const url = getExplorerTxUrl(tx.originChain, txHash)
        window.open(url, '_blank')
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