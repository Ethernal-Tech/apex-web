import Web3 from "web3";
import { CardanoAddress } from "../features/Address/interfaces";
import { CardanoNetworkType } from "../features/Address/types";
import { ApexBridgeNetwork } from "../features/enums";
import appSettings from "../settings/appSettings";
import { getBridgingMode, isEvmChain } from "../settings/chain";
import { ISettingsState } from "../settings/settingsRedux";
import { BridgeTransactionDto, ChainEnum, TransactionStatusEnum } from "../swagger/apexBridgeApiService";

const TESTNET_NEXUS_NETWORK_ID = BigInt(9070) // for Nexus testnet
const MAINNET_NEXUS_NETWORK_ID = BigInt(9069) // for Nexus mainnet

const MAINNET_BASE_NETWORK_ID = BigInt(8453) // for Base mainnet
const TESTNET_BASE_NETWORK_ID = BigInt(84532) // for Base testnet

const MAINNET_BSC_NETWORK_ID = BigInt(56) // for BNB Smart Chain mainnet
const TESTNET_BSC_NETWORK_ID = BigInt(97) // for BNB Smart Chain testnet(check for this)

const MAINNET_SOLANA_NETWORK_ID = BigInt(101) // for SOLANA mainnet
const TESTNET_SOLANA_NETWORK_ID = BigInt(103) // for SOLANA testnet

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
            networkID: CardanoNetworkType.MainNetNetwork,
            network: ApexBridgeNetwork.MainnetVector,
        },
        testnet: {
            networkID: CardanoNetworkType.MainNetNetwork,
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
    },
    [ChainEnum.Solana]:{
        mainnet:{
            networkID:  MAINNET_SOLANA_NETWORK_ID,
            network: ApexBridgeNetwork.MainnetSolana,
        },
        testnet: {
            networkID: TESTNET_SOLANA_NETWORK_ID,
            network: ApexBridgeNetwork.TestnetSolana
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
        [ApexBridgeNetwork.MainnetBsc]: ChainEnum.Bsc,
        [ApexBridgeNetwork.MainnetSolana]: ChainEnum.Solana

    },
    testnet: {
        [ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
        [ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
        [ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
        [ApexBridgeNetwork.PreviewCardano]: ChainEnum.Cardano,
        [ApexBridgeNetwork.TestnetBase]: ChainEnum.Base,
        [ApexBridgeNetwork.TestnetBsc]: ChainEnum.Bsc,
        [ApexBridgeNetwork.TestnetSolana]: ChainEnum.Solana
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
    if (networkId === MAINNET_SOLANA_NETWORK_ID){
        return ApexBridgeNetwork.MainnetSolana
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
    if (networkId === TESTNET_SOLANA_NETWORK_ID){
        return ApexBridgeNetwork.TestnetSolana
    }
  }
  return undefined;
};

export const checkChainCompatibility = (chain: ChainEnum, network: string, networkId: number|bigint, useMainnet: boolean): boolean => {
    console.log("FROM CHAIN NETWORK ID", fromChainToNetworkId(chain, useMainnet), "NETWORK ID" ,  networkId);
    console.log("FROM NETWORK TO CHAIN", fromNetworkToChain(network, useMainnet),"CHAIN", chain)

    return fromChainToNetworkId(chain, useMainnet) === networkId && fromNetworkToChain(network, useMainnet) === chain;
}

export const checkCardanoAddressCompatibility = (chain: ChainEnum, addr: CardanoAddress, useMainnet: boolean): boolean => {
    return fromChainToNetworkId(chain, useMainnet) === addr.GetNetwork();
}

const EXPLORER_URLS: {mainnet: {[key: string]: string}, testnet: {[key: string]: string}} = {
    mainnet: {
        [ChainEnum.Prime]: 'https://apexscan.org/en',
        [ChainEnum.Vector]: '',
        [ChainEnum.Nexus]: 'https://explorer.nexus.mainnet.apexfusion.org',
        [ChainEnum.Cardano]: 'https://cardanoscan.io',
        [ChainEnum.Base]: 'https://basescan.org',
        [ChainEnum.Bsc]: 'https://bscscan.com',
    },
    testnet: {
        [ChainEnum.Prime]: 'https://beta-explorer.prime.testnet.apexfusion.org/en',
        [ChainEnum.Vector]: 'https://explorer.vector.testnet.apexfusion.org',
        [ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
        [ChainEnum.Cardano]: 'https://preview.cardanoscan.io',
    },    
}

export const getExplorerTxUrl = (chain: ChainEnum, txHash: string, isLZBridging?: boolean, isNativeExplorer?: boolean) => {
    if (isLZBridging && !isNativeExplorer) {
        return `https://layerzeroscan.com/tx/${txHash}`
    }

    const base = appSettings.isMainnet || isLZBridging ? EXPLORER_URLS.mainnet[chain] : EXPLORER_URLS.testnet[chain];

    if (!base || base.trim() === '') return;

    let url
    switch (chain) {
        case ChainEnum.Vector: {
            url = `${base}/transaction/hash/${txHash}`;
            break;
        }
        case ChainEnum.Prime: {
            url = `${base}/transaction/${txHash}/summary/`;
            break;
        }
        case ChainEnum.Base:
        case ChainEnum.Bsc:
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

export const getExplorerUrl = (tx: BridgeTransactionDto | undefined) => {
    if (!tx) {
        return;
    }

    if (tx.isLayerZero){
        return getExplorerTxUrl(tx.originChain, tx.sourceTxHash, true);
    }

    if (tx.status === TransactionStatusEnum.ExecutedOnDestination && tx.destinationTxHash) {
        const txHash = isEvmChain(tx.destinationChain) && !tx.destinationTxHash.startsWith('0x')
        ? `0x${tx.destinationTxHash}` : tx.destinationTxHash;
        return getExplorerTxUrl(tx.destinationChain, txHash);
    } else if (tx.sourceTxHash) {
        const txHash = isEvmChain(tx.originChain) && !tx.sourceTxHash.startsWith('0x')
            ? `0x${tx.sourceTxHash}` : tx.sourceTxHash;
        return getExplorerTxUrl(tx.originChain, txHash);
    }
}

export const openExplorer = (tx: BridgeTransactionDto | undefined) => {
    const url = getExplorerUrl(tx);
    if (url) {
        window.open(url, '_blank');
    }
}

export const LovelaceTokenName = 'lovelace';

export const getTokenNameFromSettings = (srcChain: ChainEnum, dstChain: ChainEnum, settings: ISettingsState): string => {
    const bridgingModeInfo = getBridgingMode(srcChain, dstChain, settings);
    if (
        !bridgingModeInfo.settings || !bridgingModeInfo.settings.cardanoChainsNativeTokens || 
        !(srcChain in bridgingModeInfo.settings.cardanoChainsNativeTokens)
    ) {
        return "";
    }

    for (const item of bridgingModeInfo.settings.cardanoChainsNativeTokens[srcChain]) {
        if (item.dstChainID === dstChain) {
            const subs = item.tokenName.split('.');
            if (subs.length !== 2) {
                return item.tokenName;
            }

            return subs[0] + (new Web3()).utils.toHex(subs[1]).substring(2);
        }
    }

    return "";
}
