/* eslint-disable @typescript-eslint/no-explicit-any */
import appSettings from "@/settings/appSettings";
import { captureAndThrowError } from "@/lib/wallet/errors";
import {
  confirmTransactionSignature,
  getBalanceLamports,
  getSplTokenBalancesByMintLamports,
  sendRawTransactionBase64,
} from "@/lib/wallet/solanaRpc";
import {
  base64ToUint8Array,
  createPhantomTransactionAdapter,
  uint8ArrayToBase64,
} from "@/lib/wallet/solanaTx";

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
    return getSplTokenBalancesByMintLamports(this._address, this._useMainnet);
  };

  signAndSendTransaction = async (txRawBase64: string): Promise<string> => {
    if (!this._address || !this._provider) {
      captureAndThrowError(
        "Wallet not enabled.",
        "solWallet.ts",
        "signAndSendTransaction",
      );
    }

    const serializedTx = base64ToUint8Array(txRawBase64);
    const adapter = createPhantomTransactionAdapter(serializedTx);

    try {
      if (this._provider.signAndSendTransaction) {
        const result = await this._provider.signAndSendTransaction(adapter);
        const signature =
          typeof result === "string" ? result : result?.signature;

        if (!signature) {
          throw new Error("Phantom did not return a transaction signature");
        }

        await confirmTransactionSignature(signature, this._useMainnet);
        return signature;
      }

      const signedTx = await this._provider.signTransaction(adapter);
      const signedBytes =
        typeof signedTx?.serialize === "function"
          ? signedTx.serialize()
          : signedTx;

      const signedBase64 = uint8ArrayToBase64(
        signedBytes instanceof Uint8Array
          ? signedBytes
          : new Uint8Array(signedBytes),
      );
      const signature = await sendRawTransactionBase64(
        signedBase64,
        this._useMainnet,
      );
      await confirmTransactionSignature(signature, this._useMainnet);
      return signature;
    } catch (err: any) {
      console.error("Full error:", JSON.stringify(err, null, 2));
      console.error("Logs:", err?.logs);
      throw err;
    }
  };
}

const solWalletHandler = new SolWalletHandler();
export default solWalletHandler;
