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
  if (!walletSupported(walletVersion)) {
    return UtxoRetrieverEnum.WebApi;
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
