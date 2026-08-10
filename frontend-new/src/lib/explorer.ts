import { isEvmChain } from "@/lib/chains";
import appSettings from "@/settings/appSettings";
import {
  BridgeTransactionDto,
  ChainEnum,
  TransactionStatusEnum,
} from "@/swagger/apexBridgeApiService";

const EXPLORER_URLS: {
  mainnet: { [key: string]: string };
  testnet: { [key: string]: string };
} = {
  mainnet: {
    [ChainEnum.Prime]: "https://apexscan.org/en",
    [ChainEnum.Vector]: "https://vector.apexscan.org/en",
    [ChainEnum.Nexus]: "https://explorer.nexus.mainnet.apexfusion.org",
    [ChainEnum.Cardano]: "https://cardanoscan.io",
    [ChainEnum.Base]: "https://basescan.org",
    [ChainEnum.Bsc]: "https://bscscan.com",
    [ChainEnum.Polygon]: "https://polygonscan.com/",
    [ChainEnum.Ethereum]: "https://etherscan.io/",
    [ChainEnum.Katana]: "https://katanascan.com/",
    [ChainEnum.Sei]: "https://seiscan.io/",
    [ChainEnum.Arbitrum]: "https://arbiscan.io/",
    [ChainEnum.Scroll]: "https://scrollscan.com/",
    [ChainEnum.Unichain]: "https://unichain.blockscout.com/",
    [ChainEnum.Solana]: "https://explorer.solana.com/",
  },
  testnet: {
    [ChainEnum.Prime]: "https://beta-explorer.prime.testnet.apexfusion.org/en",
    [ChainEnum.Vector]: "https://explorer.vector.testnet.apexfusion.org",
    [ChainEnum.Nexus]: "https://explorer.nexus.testnet.apexfusion.org",
    [ChainEnum.Cardano]: "https://preview.cardanoscan.io",
    [ChainEnum.Polygon]: "https://amoy.polygonscan.com/",
    [ChainEnum.Ethereum]: "https://sepolia.etherscan.io/",
    [ChainEnum.Katana]: "https://bokuto.katanascan.com/",
    [ChainEnum.Sei]: "https://testnet.seiscan.io/",
    [ChainEnum.Arbitrum]: "https://sepolia.arbiscan.io/",
    [ChainEnum.Scroll]: "https://sepolia.scrollscan.com/",
    [ChainEnum.Unichain]: "https://unichain-sepolia.blockscout.com/",
    [ChainEnum.Solana]: "https://explorer.solana.com",
  },
};

export const getExplorerTxUrl = (
  chain: ChainEnum,
  txHash: string,
  isLZBridging?: boolean,
  isNativeExplorer?: boolean,
) => {
  if (isLZBridging && !isNativeExplorer) {
    return `https://layerzeroscan.com/tx/${txHash}`;
  }

  const base =
    appSettings.isMainnet || isLZBridging
      ? EXPLORER_URLS.mainnet[chain]
      : EXPLORER_URLS.testnet[chain];

  if (!base || base.trim() === "") return;

  let url;
  switch (chain) {
    case ChainEnum.Vector: {
      url = appSettings.isMainnet
        ? `${base}/transaction/${txHash}/summary/`
        : `${base}/transaction/hash/${txHash}`;
      break;
    }
    case ChainEnum.Prime: {
      url = `${base}/transaction/${txHash}/summary/`;
      break;
    }
    case ChainEnum.Base:
    case ChainEnum.Bsc:
    case ChainEnum.Polygon:
    case ChainEnum.Ethereum:
    case ChainEnum.Katana:
    case ChainEnum.Sei:
    case ChainEnum.Arbitrum:
    case ChainEnum.Scroll:
    case ChainEnum.Unichain:
    case ChainEnum.Nexus: {
      url = `${base}/tx/${txHash}`;
      break;
    }
    case ChainEnum.Cardano: {
      url = `${base}/transaction/${txHash}`;
      break;
    }
    case ChainEnum.Solana: {
      url = appSettings.isMainnet
        ? `${base}/tx/${txHash}`
        : `${base}/tx/${txHash}?cluster=devnet`;
      break;
    }
    default:
      return;
  }
  return url;
};

export const getExplorerUrl = (tx: BridgeTransactionDto | undefined) => {
  if (!tx) {
    return;
  }

  if (tx.isLayerZero) {
    return getExplorerTxUrl(tx.originChain, tx.sourceTxHash, true);
  }

  if (
    tx.status === TransactionStatusEnum.ExecutedOnDestination &&
    tx.destinationTxHash
  ) {
    const txHash =
      isEvmChain(tx.destinationChain) && !tx.destinationTxHash.startsWith("0x")
        ? `0x${tx.destinationTxHash}`
        : tx.destinationTxHash;
    return getExplorerTxUrl(tx.destinationChain, txHash);
  } else if (tx.sourceTxHash) {
    const txHash =
      isEvmChain(tx.originChain) && !tx.sourceTxHash.startsWith("0x")
        ? `0x${tx.sourceTxHash}`
        : tx.sourceTxHash;
    return getExplorerTxUrl(tx.originChain, txHash);
  }
};

export const openExplorer = (tx: BridgeTransactionDto | undefined) => {
  const url = getExplorerUrl(tx);
  if (url) {
    window.open(url, "_blank");
  }
};
