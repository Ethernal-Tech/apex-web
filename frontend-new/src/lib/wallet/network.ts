import {
  CardanoNetworkType,
  SolanaNetworkType,
} from "@/lib/wallet/address/types";
import { ApexBridgeNetwork } from "@/lib/wallet/enums";

const TESTNET_NEXUS_NETWORK_ID = BigInt(9070);
const MAINNET_NEXUS_NETWORK_ID = BigInt(9069);
const MAINNET_BASE_NETWORK_ID = BigInt(8453);
const TESTNET_BASE_NETWORK_ID = BigInt(84532);
const MAINNET_BSC_NETWORK_ID = BigInt(56);
const TESTNET_BSC_NETWORK_ID = BigInt(97);
const TESTNET_POLYGON_NETWORK_ID = BigInt(80002);
const MAINNET_POLYGON_NETWORK_ID = BigInt(137);
const TESTNET_ETHEREUM_NETWORK_ID = BigInt(11155111);
const MAINNET_ETHEREUM_NETWORK_ID = BigInt(1);
const TESTNET_KATANA_NETWORK_ID = BigInt(737373);
const MAINNET_KATANA_NETWORK_ID = BigInt(747474);
const TESTNET_SEI_NETWORK_ID = BigInt(1328);
const MAINNET_SEI_NETWORK_ID = BigInt(1329);
const TESTNET_ARBITRUM_NETWORK_ID = BigInt(421614);
const MAINNET_ARBITRUM_NETWORK_ID = BigInt(42161);
const TESTNET_SCROLL_NETWORK_ID = BigInt(534351);
const MAINNET_SCROLL_NETWORK_ID = BigInt(534352);
const TESTNET_UNICHAIN_NETWORK_ID = BigInt(1301);
const MAINNET_UNICHAIN_NETWORK_ID = BigInt(130);

type ChainData = {
  mainnet: { networkID: number | bigint; network: ApexBridgeNetwork };
  testnet: { networkID: number | bigint; network: ApexBridgeNetwork };
};

const CHAIN_DATA: Record<string, ChainData> = {
  prime: {
    mainnet: {
      networkID: CardanoNetworkType.MainNetNetwork,
      network: ApexBridgeNetwork.MainnetPrime,
    },
    testnet: {
      networkID: CardanoNetworkType.TestNetNetwork,
      network: ApexBridgeNetwork.TestnetPrime,
    },
  },
  vector: {
    mainnet: {
      networkID: CardanoNetworkType.MainNetNetwork,
      network: ApexBridgeNetwork.MainnetVector,
    },
    testnet: {
      networkID: CardanoNetworkType.MainNetNetwork,
      network: ApexBridgeNetwork.TestnetVector,
    },
  },
  nexus: {
    mainnet: {
      networkID: MAINNET_NEXUS_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetNexus,
    },
    testnet: {
      networkID: TESTNET_NEXUS_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetNexus,
    },
  },
  cardano: {
    mainnet: {
      networkID: CardanoNetworkType.MainNetNetwork,
      network: ApexBridgeNetwork.MainnetCardano,
    },
    testnet: {
      networkID: CardanoNetworkType.TestNetNetwork,
      network: ApexBridgeNetwork.PreviewCardano,
    },
  },
  base: {
    mainnet: {
      networkID: MAINNET_BASE_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetBase,
    },
    testnet: {
      networkID: TESTNET_BASE_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetBase,
    },
  },
  bsc: {
    mainnet: {
      networkID: MAINNET_BSC_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetBsc,
    },
    testnet: {
      networkID: TESTNET_BSC_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetBsc,
    },
  },
  polygon: {
    mainnet: {
      networkID: MAINNET_POLYGON_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetPolygon,
    },
    testnet: {
      networkID: TESTNET_POLYGON_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetPolygon,
    },
  },
  ethereum: {
    mainnet: {
      networkID: MAINNET_ETHEREUM_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetEthereum,
    },
    testnet: {
      networkID: TESTNET_ETHEREUM_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetEthereum,
    },
  },
  katana: {
    mainnet: {
      networkID: MAINNET_KATANA_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetKatana,
    },
    testnet: {
      networkID: TESTNET_KATANA_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetKatana,
    },
  },
  sei: {
    mainnet: {
      networkID: MAINNET_SEI_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetSei,
    },
    testnet: {
      networkID: TESTNET_SEI_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetSei,
    },
  },
  arbitrum: {
    mainnet: {
      networkID: MAINNET_ARBITRUM_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetArbitrum,
    },
    testnet: {
      networkID: TESTNET_ARBITRUM_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetArbitrum,
    },
  },
  scroll: {
    mainnet: {
      networkID: MAINNET_SCROLL_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetScroll,
    },
    testnet: {
      networkID: TESTNET_SCROLL_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetScroll,
    },
  },
  unichain: {
    mainnet: {
      networkID: MAINNET_UNICHAIN_NETWORK_ID,
      network: ApexBridgeNetwork.MainnetUnichain,
    },
    testnet: {
      networkID: TESTNET_UNICHAIN_NETWORK_ID,
      network: ApexBridgeNetwork.TestnetUnichain,
    },
  },
  solana: {
    mainnet: {
      networkID: SolanaNetworkType.MainNetNetwork,
      network: ApexBridgeNetwork.MainnetSolana,
    },
    testnet: {
      networkID: SolanaNetworkType.TestNetNetwork,
      network: ApexBridgeNetwork.TestnetSolana,
    },
  },
};

const NETWORK_TO_CHAIN: {
  mainnet: Record<string, string>;
  testnet: Record<string, string>;
} = {
  mainnet: {
    [ApexBridgeNetwork.MainnetPrime]: "prime",
    [ApexBridgeNetwork.MainnetVector]: "vector",
    [ApexBridgeNetwork.MainnetNexus]: "nexus",
    [ApexBridgeNetwork.MainnetCardano]: "cardano",
    [ApexBridgeNetwork.MainnetBase]: "base",
    [ApexBridgeNetwork.MainnetBsc]: "bsc",
    [ApexBridgeNetwork.MainnetPolygon]: "polygon",
    [ApexBridgeNetwork.MainnetEthereum]: "ethereum",
    [ApexBridgeNetwork.MainnetKatana]: "katana",
    [ApexBridgeNetwork.MainnetSei]: "sei",
    [ApexBridgeNetwork.MainnetArbitrum]: "arbitrum",
    [ApexBridgeNetwork.MainnetScroll]: "scroll",
    [ApexBridgeNetwork.MainnetUnichain]: "unichain",
    [ApexBridgeNetwork.MainnetSolana]: "solana",
  },
  testnet: {
    [ApexBridgeNetwork.TestnetPrime]: "prime",
    [ApexBridgeNetwork.TestnetVector]: "vector",
    [ApexBridgeNetwork.TestnetNexus]: "nexus",
    [ApexBridgeNetwork.PreviewCardano]: "cardano",
    [ApexBridgeNetwork.TestnetBase]: "base",
    [ApexBridgeNetwork.TestnetBsc]: "bsc",
    [ApexBridgeNetwork.TestnetPolygon]: "polygon",
    [ApexBridgeNetwork.TestnetEthereum]: "ethereum",
    [ApexBridgeNetwork.TestnetKatana]: "katana",
    [ApexBridgeNetwork.TestnetSei]: "sei",
    [ApexBridgeNetwork.TestnetArbitrum]: "arbitrum",
    [ApexBridgeNetwork.TestnetScroll]: "scroll",
    [ApexBridgeNetwork.TestnetUnichain]: "unichain",
    [ApexBridgeNetwork.TestnetSolana]: "solana",
  },
};

export function fromChainToNetwork(
  chain: string,
  useMainnet: boolean,
): ApexBridgeNetwork | undefined {
  return useMainnet
    ? CHAIN_DATA[chain]?.mainnet?.network
    : CHAIN_DATA[chain]?.testnet?.network;
}

export function fromNetworkToChain(
  network: string,
  useMainnet: boolean,
): string | undefined {
  return useMainnet
    ? NETWORK_TO_CHAIN.mainnet[network]
    : NETWORK_TO_CHAIN.testnet[network];
}

export function fromChainToNetworkId(
  chain: string,
  useMainnet: boolean,
): number | bigint | undefined {
  return useMainnet
    ? CHAIN_DATA[chain]?.mainnet?.networkID
    : CHAIN_DATA[chain]?.testnet?.networkID;
}

export function fromEvmNetworkIdToNetwork(
  networkId: bigint,
  useMainnet: boolean,
): ApexBridgeNetwork | undefined {
  if (useMainnet) {
    if (networkId === MAINNET_NEXUS_NETWORK_ID)
      return ApexBridgeNetwork.MainnetNexus;
    if (networkId === MAINNET_BASE_NETWORK_ID)
      return ApexBridgeNetwork.MainnetBase;
    if (networkId === MAINNET_BSC_NETWORK_ID)
      return ApexBridgeNetwork.MainnetBsc;
    if (networkId === MAINNET_POLYGON_NETWORK_ID)
      return ApexBridgeNetwork.MainnetPolygon;
    if (networkId === MAINNET_ETHEREUM_NETWORK_ID)
      return ApexBridgeNetwork.MainnetEthereum;
    if (networkId === MAINNET_KATANA_NETWORK_ID)
      return ApexBridgeNetwork.MainnetKatana;
    if (networkId === MAINNET_SEI_NETWORK_ID)
      return ApexBridgeNetwork.MainnetSei;
    if (networkId === MAINNET_ARBITRUM_NETWORK_ID)
      return ApexBridgeNetwork.MainnetArbitrum;
    if (networkId === MAINNET_SCROLL_NETWORK_ID)
      return ApexBridgeNetwork.MainnetScroll;
    if (networkId === MAINNET_UNICHAIN_NETWORK_ID)
      return ApexBridgeNetwork.MainnetUnichain;
  } else {
    if (networkId === TESTNET_NEXUS_NETWORK_ID)
      return ApexBridgeNetwork.TestnetNexus;
    if (networkId === TESTNET_BASE_NETWORK_ID)
      return ApexBridgeNetwork.TestnetBase;
    if (networkId === TESTNET_BSC_NETWORK_ID)
      return ApexBridgeNetwork.TestnetBsc;
    if (networkId === TESTNET_POLYGON_NETWORK_ID)
      return ApexBridgeNetwork.TestnetPolygon;
    if (networkId === TESTNET_ETHEREUM_NETWORK_ID)
      return ApexBridgeNetwork.TestnetEthereum;
    if (networkId === TESTNET_KATANA_NETWORK_ID)
      return ApexBridgeNetwork.TestnetKatana;
    if (networkId === TESTNET_SEI_NETWORK_ID)
      return ApexBridgeNetwork.TestnetSei;
    if (networkId === TESTNET_ARBITRUM_NETWORK_ID)
      return ApexBridgeNetwork.TestnetArbitrum;
    if (networkId === TESTNET_SCROLL_NETWORK_ID)
      return ApexBridgeNetwork.TestnetScroll;
    if (networkId === TESTNET_UNICHAIN_NETWORK_ID)
      return ApexBridgeNetwork.TestnetUnichain;
  }
  return undefined;
}

export function checkChainCompatibility(
  chain: string,
  network: string,
  networkId: number | bigint,
  useMainnet: boolean,
): boolean {
  return (
    fromChainToNetworkId(chain, useMainnet) === networkId &&
    fromNetworkToChain(network, useMainnet) === chain
  );
}

export function checkCardanoAddressCompatibility(
  chain: string,
  addr: { GetNetwork(): number },
  useMainnet: boolean,
): boolean {
  return fromChainToNetworkId(chain, useMainnet) === addr.GetNetwork();
}
