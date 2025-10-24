// solanaWalletHandler.ts
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import Solflare from "@solflare-wallet/sdk";
// If you don't want the SDK, you can swap to `const wallet = (window as any).solflare` in getWallet()

import { getAssociatedTokenAddress } from "@solana/spl-token";

type Wallet = {
  name: string;
  icon: string;
  version: string;
};

export const SOL_SUPPORTED_WALLETS: Wallet[] = [
  {
    name: "Solflare",
    icon: "https://solflare.com/favicon-32x32.png",
    version: "N/A",
  },
];

// add at top-level
const CLUSTER_IDS: Record<SolanaCluster, number> = {
  "mainnet-beta": 101,
  testnet: 102,
  devnet: 103,
};

/** Optional: restrict allowed clusters */
export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

class SolanaWalletHandler {
  private _enabled = false;
  private _wallet: Solflare | undefined;
  private _connection: Connection | undefined;
  private _endpoint: string;
  private _cluster: SolanaCluster;

  private onAccountsChanged: (address: string | undefined) => Promise<void> =
    async () => undefined;

  constructor(cluster: SolanaCluster = "devnet", endpoint?: string) {
    this._cluster = cluster;
    this._endpoint = endpoint ?? clusterApiUrl(cluster);
  }

  /** If you want to change cluster at runtime */
  setNetwork = (cluster: SolanaCluster, endpoint?: string) => {
    this._cluster = cluster;
    this._endpoint = endpoint ?? clusterApiUrl(cluster);
    this._connection = undefined; // force re-create
  };

  getInstalledWallets = (): Wallet[] => {
    // With SDK you don't need the injected provider, but we keep the same API as your EVM one
    return SOL_SUPPORTED_WALLETS;
  };

  private getConnection = (): Connection => {
    if (!this._connection) {
      this._connection = new Connection(this._endpoint, "confirmed");
    }
    return this._connection;
  };

  /** Using the SDK keeps web, extension, and mobile flows consistent */
  private getWallet = (): Solflare => {
    if (!this._wallet) {
      this._wallet = new Solflare();
    }
    return this._wallet;
  };

  /** Solana doesn’t “switch chain” via wallet; you choose RPC/cluster */
  enable = async (
    onAccountsChanged: (address: string | undefined) => Promise<void>
  ) => {
    const wallet = this.getWallet();
    this.onAccountsChanged = onAccountsChanged;

    wallet.on("connect", async () => {
      this._enabled = true;
      await this.onAccountsChanged(wallet.publicKey?.toBase58());
    });
    wallet.on("disconnect", async () => {
      this._enabled = false;
      await this.onAccountsChanged(undefined);
    });
    // Some wallets fire this, Solflare SDK forwards account changes:
    wallet.on("accountChanged", async (pk?: PublicKey) => {
      await this.onAccountsChanged(pk?.toBase58());
    });

    try {
      await wallet.connect(); // prompts user
    } catch (err) {
      this._enabled = false;
      throw err;
    }
  };

  clearEnabledWallet = async () => {
    const wallet = this._wallet;
    this._enabled = false;
    if (wallet) {
      try {
        await wallet.disconnect();
      } catch {}
      // Solflare SDK manages its own listeners; nothing to manually remove here
    }
  };

  private _isEnabled = () => this._enabled && !!this._wallet?.publicKey;
  checkWallet = (): boolean => this._isEnabled();

  private _checkWalletAndThrow = () => {
    if (!this.checkWallet()) throw new Error("Wallet not enabled");
  };

  /** Address (base58) */
  getAddress = async (): Promise<string | undefined> => {
    this._checkWalletAndThrow();
    return this.getWallet().publicKey?.toBase58();
  };

  /** Balance in lamports, returned as string (to mirror your EVM 'wei' string) */
  getBalance = async (): Promise<string> => {
    this._checkWalletAndThrow();
    const pk = this.getWallet().publicKey!;
    const lamports = await this.getConnection().getBalance(pk, "confirmed");
    return lamports.toString(); // lamports (like "wei")
  };

  /** Convenience: SOL as decimal string */
  getBalanceSOL = async (): Promise<string> => {
    const lamports = BigInt(await this.getBalance());
    // String division keeping up to 9 decimals:
    const whole = lamports / BigInt(LAMPORTS_PER_SOL);
    const frac = lamports % BigInt(LAMPORTS_PER_SOL);
    const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  };

  /** “Network ID” analogue: return the current endpoint (or cluster) */
  getNetwork = async (): Promise<{
    cluster: SolanaCluster;
    endpoint: string;
  }> => {
    return { cluster: this._cluster, endpoint: this._endpoint };
  };

  /** Submit a transaction: sign with Solflare and send via RPC */
  submitTx = async (tx: Transaction): Promise<any> => {
    this._checkWalletAndThrow();
    const wallet = this.getWallet();
    const connection = this.getConnection();

    tx.feePayer = wallet.publicKey!;
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;

    const signed = await wallet.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    return {signature: sig, blockHash: blockhash};
  };

  /** Sign an arbitrary message (if supported) */
  signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    this._checkWalletAndThrow();
    const wallet = this.getWallet();
    if (!wallet.signMessage)
      throw new Error("signMessage not supported by wallet");
    return await wallet.signMessage(message, "utf8");
  };

  /** SPL token balance for a given mint (base58); returns raw amount as string */
  getSPLTokenBalance = async (mintAddress: string): Promise<string> => {
    this._checkWalletAndThrow();
    const connection = this.getConnection();
    const owner = this.getWallet().publicKey!;
    const mint = new PublicKey(mintAddress);

    // Find Associated Token Account for the owner/mint pair:
    const ata = await getAssociatedTokenAddress(mint, owner, false);
    // If ATA doesn't exist, this call throws; catch and return "0"
    try {
      const balance = await connection.getTokenAccountBalance(ata, "confirmed");
      return balance.value.amount; // raw integer string (no decimals applied)
    } catch {
      // Fallback: maybe no ATA yet
      return "0";
    }
  };

  // --------- EVM-only stubs for parity with your API ---------
  getGasPrice = async () => {
    throw new Error("Not supported on Solana.");
  };

  getFeeHistory = async () => {
    throw new Error("Not supported on Solana.");
  };

  estimateGas = async () => {
    throw new Error("Not supported on Solana.");
  };

  getNetworkId = async (): Promise<number> => {
    return CLUSTER_IDS[this._cluster];
  };

    getFeeForTransaction = async (tx: Transaction): Promise<string> => {
    this._checkWalletAndThrow();
    const connection = this.getConnection();
    const feePayer = this.getWallet().publicKey;

    if (!feePayer) {
      console.warn("No fee payer available to estimate transaction fee.");
      return "0";
    }

    tx.feePayer = feePayer;
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    tx.recentBlockhash = blockhash;

    const message = tx.compileMessage();

    const feeInLamports = await connection.getFeeForMessage(
      message,
      "finalized"
    );

    if (feeInLamports.value === null) {
      throw new Error("Could not estimate fee for transaction. It might be too large or invalid.");
    }

    return feeInLamports.value.toString();
  };

}

const solanaWalletHandler = new SolanaWalletHandler(/* default devnet */);
// Optionally: new SolanaWalletHandler("mainnet-beta", "https://your-rpc.endpoint")

export default solanaWalletHandler;

/** If you reference window.solflare elsewhere, add this (optional) global typing: */
declare global {
  interface Window {
    solflare?: {
      isSolflare?: boolean;
      publicKey?: PublicKey;
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      signTransaction: (tx: Transaction) => Promise<Transaction>;
      signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
      signMessage?: (msg: Uint8Array, encoding?: string) => Promise<Uint8Array>;
    };
  }
}
