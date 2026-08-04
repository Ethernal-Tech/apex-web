import appSettings from "@/settings/appSettings";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import {
  getBalanceLamports,
  getSplTokenBalancesByMintLamports,
} from "@/lib/wallet/solanaRpc";

type WalletInfo = {
  name: string;
  icon: string;
  version: string;
};

export const SOL_SUPPORTED_WALLETS: WalletInfo[] = [
  {
    name: "Phantom",
    icon: "https://phantom.app/img/phantom-icon-purple.svg",
    version: "N/A",
  },
];

class SolWalletHandler {
  private _provider: any | undefined;
  private _address: string | undefined;
  private _useMainnet: boolean | undefined;

  private resolvePhantomProvider(): any {
    const provider = (window as any)?.phantom?.solana;
    if (!provider) {
      captureAndThrowError(
        "Phantom provider not found. Make sure the Phantom extension is installed and unlocked.",
        "solWallet.ts",
        "resolvePhantomProvider",
      );
    }
    return provider;
  }

  getInstalledWallets = (): WalletInfo[] => {
    if (typeof window === "undefined" || !(window as any)?.phantom?.solana) {
      return [];
    }
    return SOL_SUPPORTED_WALLETS;
  };

  checkWallet = (): boolean => !!this._provider && !!this._address;

  enable = async (useMainnet?: boolean): Promise<boolean> => {
    this._useMainnet = useMainnet ?? appSettings.isMainnet;
    this._provider = this.resolvePhantomProvider();

    const resp = await this._provider.connect();
    const publicKey = resp?.publicKey;

    if (!publicKey) {
      captureAndThrowError(
        "Phantom connect succeeded but returned no publicKey.",
        "solWallet.ts",
        "enable",
      );
    }

    this._address =
      typeof publicKey === "string"
        ? publicKey
        : (publicKey?.toBase58?.() ?? String(publicKey));

    return true;
  };

  disconnect = async (): Promise<void> => {
    try {
      if (this._provider?.disconnect) {
        await this._provider.disconnect();
      }
    } finally {
      this._provider = undefined;
      this._address = undefined;
      this._useMainnet = undefined;
    }
  };

  getAddress = (): string => {
    if (!this._address) {
      captureAndThrowError("Wallet not enabled.", "solWallet.ts", "getAddress");
    }
    return this._address;
  };

  getBalanceLamports = async (): Promise<bigint> => {
    if (!this._address) {
      captureAndThrowError(
        "Wallet not enabled.",
        "solWallet.ts",
        "getBalanceLamports",
      );
    }
    return getBalanceLamports(this._address, this._useMainnet);
  };

  getSplTokenBalancesByMint = async (): Promise<Record<string, bigint>> => {
    if (!this._address) {
      captureAndThrowError(
        "Wallet not enabled.",
        "solWallet.ts",
        "getSplTokenBalancesByMint",
      );
    }
    try {
      return await getSplTokenBalancesByMintLamports(
        this._address,
        this._useMainnet,
      );
    } catch (err) {
      captureException(err, {
        tags: {
          component: "solWallet.ts",
          action: "getSplTokenBalancesByMint",
        },
      });
      return {};
    }
  };
}

const solWalletHandler = new SolWalletHandler();
export default solWalletHandler;
