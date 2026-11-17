/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from "web3";
import { toHex } from "web3-utils";
import type { BlockNumberOrTag, Numbers, Transaction } from "web3-types";

type SendTransactionOptions = {
  checkRevertBeforeSending?: boolean;
};
import { ERC20_MIN_ABI } from "@/lib/wallet/abi";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import { shortRetryOptions, wait } from "@/lib/wallet/utils";
import { findEip6963Provider, METAMASK_RDNS } from "@/lib/wallet/eip6963";

type WalletInfo = {
  name: string;
  icon: string;
  version: string;
};

export const EVM_SUPPORTED_WALLETS: WalletInfo[] = [
  {
    name: "MetaMask",
    icon: "https://metamask.io/images/metamask-logo.png",
    version: "N/A",
  },
];

/** EIP-1193 surface we rely on - some extensions posing as MetaMask lack it. */
const isEip1193Provider = (provider: any): boolean =>
  typeof provider?.request === "function" &&
  typeof provider?.on === "function" &&
  typeof provider?.removeListener === "function";

class EvmWalletHandler {
  private _enabled = false;
  private web3: Web3 | undefined;
  private provider: any | undefined;
  private listenersAttached = false;
  private onAccountsChanged: (accounts: string[]) => Promise<void> = () =>
    new Promise<void>(() => undefined);
  private onChainChanged: (chainId: string) => Promise<void> = async () =>
    new Promise<void>(() => undefined);

  /** MetaMask provider; may be a non-compliant impostor, see isEip1193Provider. */
  private getMetaMaskProvider = (): any | undefined => {
    if (typeof window === "undefined") return undefined;

    const announced = findEip6963Provider(METAMASK_RDNS);
    if (announced) return announced;

    // Legacy fallback for wallets without EIP-6963 support.
    const injected = (window as any).ethereum;
    if (!injected) return undefined;

    if (Array.isArray(injected.providers)) {
      return (
        injected.providers.find((p: any) => p.isMetaMask && !p.isPhantom) ??
        undefined
      );
    }

    return injected.isMetaMask && !injected.isPhantom ? injected : undefined;
  };

  getInstalledWallets = (): WalletInfo[] => {
    if (!this.getMetaMaskProvider()) return [];
    return EVM_SUPPORTED_WALLETS;
  };

  getWeb3 = (): Web3 | undefined => {
    if (this.web3 === undefined) {
      const provider = this.getMetaMaskProvider();
      if (!isEip1193Provider(provider)) {
        return;
      }

      this.provider = provider;
      this.web3 = new Web3(this.provider);
      this.web3.transactionBlockTimeout = 200;
    }

    return this.web3;
  };

  accountsChanged = async (accounts: string[]) =>
    await this.onAccountsChanged(accounts);
  chainChanged = async (chainId: string) => await this.onChainChanged(chainId);

  enable = async (
    expectedChainId: bigint,
    onAccountsChanged: (accounts: string[]) => Promise<void>,
    onChainChanged: (chainId: string) => Promise<void>,
  ) => {
    if (!this.getWeb3()) {
      if (this.getMetaMaskProvider()) {
        captureAndThrowError(
          "Unsupported wallet detected. Please use MetaMask, or disable other wallet extensions that override it.",
          "evmWallet.ts",
          "enable",
        );
      }
      return;
    }

    this._enabled = true;

    this.onAccountsChanged = onAccountsChanged;
    this.onChainChanged = onChainChanged;
    if (!this.listenersAttached) {
      this.provider.on("accountsChanged", this.accountsChanged);
      this.provider.on("chainChanged", this.chainChanged);
      this.listenersAttached = true;
    }

    await this.forceChainWithRetry(expectedChainId);

    try {
      await this.provider.request({ method: "eth_requestAccounts" });
    } catch {
      console.error("User denied account access");
      this._enabled = false;
    }
  };

  clearEnabledWallet = () => {
    const { provider, listenersAttached } = this;

    // Reset first so a failing removeListener can't leave a stale provider
    // cached for the next connect attempt; its error still propagates.
    this._enabled = false;
    this.provider = undefined;
    this.web3 = undefined;
    this.listenersAttached = false;

    if (listenersAttached) {
      provider.removeListener("accountsChanged", this.accountsChanged);
      provider.removeListener("chainChanged", this.chainChanged);
    }
  };

  private _isEnabled = () => !!this._enabled && !!this.getWeb3();

  checkWallet = (): boolean => this._isEnabled();

  private _checkWalletAndThrow = () => {
    if (!this.checkWallet()) {
      captureAndThrowError(
        "Wallet not enabled",
        "evmWallet.ts",
        "_checkWalletAndThrow",
      );
    }
  };

  private forceChainWithRetry = async (
    expectedChainId: bigint,
    retryCount = 1,
  ): Promise<void> => {
    let wrongChain = false;
    try {
      const chainId = (await this.provider.request({
        method: "eth_chainId",
      })) as unknown as string;
      wrongChain = parseChainId(chainId) !== expectedChainId;
    } catch (enableError: any) {
      const enableErr = enableError?.data?.originalError ?? enableError;
      if (retryCount < shortRetryOptions.retryCnt && enableErr.code !== 4001) {
        if (enableErr.code === 4902) {
          wrongChain = true;
        } else {
          await wait(shortRetryOptions.waitTime);
          return await this.forceChainWithRetry(
            expectedChainId,
            retryCount + 1,
          );
        }
      } else {
        captureAndThrowError(
          enableError,
          "evmWallet.ts",
          "forceChainWithRetry",
        );
      }
    }

    if (wrongChain) {
      try {
        await this.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex(expectedChainId) }],
        });
      } catch (e) {
        console.log(e);
        captureAndThrowError(
          `Failed to switch to network with ID: ${expectedChainId}. Try adding that network to the wallet first.`,
          "evmWallet.ts",
          "forceChainWithRetry",
        );
      }

      await wait(shortRetryOptions.waitTime);
      return await this.forceChainWithRetry(expectedChainId, retryCount + 1);
    }
  };

  getAddress = async (): Promise<string | undefined> => {
    this._checkWalletAndThrow();
    const accounts = await this.getWeb3()!.eth.getAccounts();
    return accounts.length > 0 ? accounts[0] : undefined;
  };

  getNetworkId = async (): Promise<bigint> => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.net.getId();
  };

  getBalance = async (): Promise<string> => {
    this._checkWalletAndThrow();
    const accounts = await this.getWeb3()!.eth.getAccounts();
    const balance = await this.getWeb3()!.eth.getBalance(accounts[0]);
    return this.getWeb3()!.utils.fromWei(balance, "wei");
  };

  getERC20Balance = async (tokenAddress: string): Promise<string> => {
    this._checkWalletAndThrow();
    const account = await this.getAddress();
    if (!account) {
      captureAndThrowError(
        "No connected wallet address.",
        "evmWallet.ts",
        "getERC20Balance",
      );
    }

    try {
      const web3 = this.getWeb3();
      const contract = new web3!.eth.Contract(ERC20_MIN_ABI, tokenAddress);
      const rawBalResp = await contract.methods.balanceOf(account).call();
      const raw = Array.isArray(rawBalResp) ? rawBalResp[0] : rawBalResp;
      return web3!.utils.fromWei(BigInt(raw as any), "wei");
    } catch (e) {
      captureException(e, {
        tags: { component: "evmWallet.ts", action: "getERC20Balance" },
      });
      return "0";
    }
  };

  submitTx = (tx: Transaction, opts?: SendTransactionOptions) => {
    this._checkWalletAndThrow();
    return this.getWeb3()!.eth.sendTransaction(tx, undefined, opts);
  };

  estimateGas = async (tx: Transaction) => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.estimateGas(tx);
  };

  getFeeHistory = async (
    blockCount: Numbers,
    newestBlock: BlockNumberOrTag | undefined,
    rewardPercentiles: Numbers[],
  ) => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.getFeeHistory(
      blockCount,
      newestBlock,
      rewardPercentiles,
    );
  };

  getGasPrice = async () => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.getGasPrice();
  };

  getTransactionReceipt = async (txHash: string) => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.getTransactionReceipt(txHash);
  };

  getBlock = async (
    blockNumberOrHash: BlockNumberOrTag | string = "latest",
    returnTransactionObjects = false,
  ) => {
    this._checkWalletAndThrow();
    return await this.getWeb3()!.eth.getBlock(
      blockNumberOrHash,
      returnTransactionObjects,
    );
  };
}

const parseChainId = (chainId: string | number): bigint => {
  return BigInt(
    typeof chainId === "number"
      ? chainId
      : Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10),
  );
};

const evmWalletHandler = new EvmWalletHandler();
export default evmWalletHandler;
