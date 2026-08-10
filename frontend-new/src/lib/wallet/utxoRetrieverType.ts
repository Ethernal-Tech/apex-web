import { captureException } from "@/lib/wallet/errors";
import appSettings from "@/settings/appSettings";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import { UtxoRetrieverEnum } from "@/lib/wallet/enums";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";

const supportedWalletVersion = { major: 2, minor: 0, patch: 9, build: 14 };

export const getUtxoRetrieverType = (chain: string): UtxoRetrieverEnum => {
  if (isEvmChain(chain) || isSolanaChain(chain)) {
    return UtxoRetrieverEnum.Wallet;
  }

  if (!cardanoWalletHandler.checkWallet()) {
    return UtxoRetrieverEnum.Wallet;
  }

  const walletVersion = cardanoWalletHandler.version();
  const utxoRetrieverConfig =
    !!appSettings.utxoRetriever && appSettings.utxoRetriever[chain];

  if (
    utxoRetrieverConfig &&
    (utxoRetrieverConfig.force || !walletSupported(walletVersion))
  ) {
    if (utxoRetrieverConfig.url) {
      if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Blockfrost) {
        return UtxoRetrieverEnum.Blockfrost;
      } else if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Ogmios) {
        return UtxoRetrieverEnum.Ogmios;
      } else {
        console.log(`Unknown utxo retriever type: ${utxoRetrieverConfig.type}`);
        captureException(
          `Unknown utxo retriever type: ${utxoRetrieverConfig.type}`,
          {
            tags: {
              component: "utxoRetrieverType.ts",
              action: "getUtxoRetrieverType",
            },
          },
        );
      }
    } else {
      console.log(
        `utxo retriever url not provided for: ${utxoRetrieverConfig.type}`,
      );
      captureException(
        `utxo retriever url not provided for: ${utxoRetrieverConfig.type}`,
        {
          tags: {
            component: "utxoRetrieverType.ts",
            action: "getUtxoRetrieverType",
          },
        },
      );
    }
  }

  return UtxoRetrieverEnum.Wallet;
};

const walletSupported = (walletVersion: unknown): boolean => {
  if (
    !walletVersion ||
    typeof walletVersion !== "object" ||
    typeof (walletVersion as { major?: unknown }).major !== "number" ||
    typeof (walletVersion as { minor?: unknown }).minor !== "number" ||
    typeof (walletVersion as { patch?: unknown }).patch !== "number" ||
    typeof (walletVersion as { build?: unknown }).build !== "number"
  ) {
    // invalid wallet version format
    return false;
  }

  const { major, minor, patch, build } = walletVersion as {
    major: number;
    minor: number;
    patch: number;
    build: number;
  };
  const supported = supportedWalletVersion;
  return (
    major > supported.major ||
    (major === supported.major && minor > supported.minor) ||
    (major === supported.major &&
      minor === supported.minor &&
      patch > supported.patch) ||
    (major === supported.major &&
      minor === supported.minor &&
      patch === supported.patch &&
      build >= supported.build)
  );
};
