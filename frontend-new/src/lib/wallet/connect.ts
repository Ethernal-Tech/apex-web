import { getSrcChains, isEvmChain, isSolanaChain } from "@/lib/chains";
import type { SettingsResponse } from "@/lib/api/settings";
import appSettings from "@/settings/appSettings";
import cardanoWalletHandler, {
  SUPPORTED_WALLETS,
} from "@/lib/wallet/cardanoWallet";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import evmWalletHandler, {
  EVM_SUPPORTED_WALLETS,
} from "@/lib/wallet/evmWallet";
import {
  checkChainCompatibility,
  fromChainToNetwork,
  fromChainToNetworkId,
  fromEvmNetworkIdToNetwork,
} from "@/lib/wallet/network";
import solWalletHandler, {
  SOL_SUPPORTED_WALLETS,
} from "@/lib/wallet/solWallet";
import { retry, shortRetryOptions, shouldUseMainnet } from "@/lib/wallet/utils";
import { ApexBridgeNetwork } from "@/lib/wallet/enums";
import { ChainEnum } from "@/swagger/apexBridgeApiService";

export type WalletAccount = {
  account: string;
  networkId: number | bigint;
  network: ApexBridgeNetwork;
};

export type WalletSession = {
  walletName: string;
  account: WalletAccount;
};

export type ConnectHandlers = {
  onSession: (session: WalletSession | null) => void;
  onError?: (message: string) => void;
};

const STORAGE_WALLET_KEY = "selected_wallet";
const STORAGE_ACCOUNT_KEY = "selected_wallet_account";
const STORAGE_SOURCE_CHAIN_KEY = "selected_chain";
const STORAGE_DEST_CHAIN_KEY = "destination_chain";

export function loadStoredWalletName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_WALLET_KEY);
}

export function persistWalletName(name: string | null) {
  if (typeof window === "undefined") return;
  if (name) localStorage.setItem(STORAGE_WALLET_KEY, name);
  else localStorage.removeItem(STORAGE_WALLET_KEY);
}

function clearLegacyStoredAccount() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_ACCOUNT_KEY);
}

export function loadStoredSourceChain(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_SOURCE_CHAIN_KEY);
}

export function persistSourceChain(chain: string | null) {
  if (typeof window === "undefined") return;
  if (chain) localStorage.setItem(STORAGE_SOURCE_CHAIN_KEY, chain);
  else localStorage.removeItem(STORAGE_SOURCE_CHAIN_KEY);
}

export function loadStoredDestinationChain(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_DEST_CHAIN_KEY);
}

export function persistDestinationChain(chain: string | null) {
  if (typeof window === "undefined") return;
  if (chain) localStorage.setItem(STORAGE_DEST_CHAIN_KEY, chain);
  else localStorage.removeItem(STORAGE_DEST_CHAIN_KEY);
}

export function initChainsState(): {
  chain: string;
  destinationChain: string;
} {
  const chain = loadStoredSourceChain();
  const destinationChain = loadStoredDestinationChain();

  if (!chain || !destinationChain || chain === destinationChain) {
    const src = ChainEnum.Prime;
    const dst = appSettings.isSkyline ? ChainEnum.Cardano : ChainEnum.Vector;
    persistSourceChain(src);
    persistDestinationChain(dst);
    return { chain: src, destinationChain: dst };
  }

  return { chain, destinationChain };
}

async function checkAndSetEvmData(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
) {
  const useMainnet = shouldUseMainnet(srcChain, dstChain);
  const networkId = await retry(
    evmWalletHandler.getNetworkId,
    shortRetryOptions.retryCnt,
    shortRetryOptions.waitTime,
  );
  const network = fromEvmNetworkIdToNetwork(networkId, useMainnet);
  if (!network) {
    const expectedNetworkId = fromChainToNetworkId(srcChain, useMainnet);
    captureAndThrowError(
      `Invalid networkId: ${networkId}. Expected networkId: ${expectedNetworkId}. Please select network with networkId: ${expectedNetworkId} in your wallet.`,
      "connect.ts",
      "checkAndSetEvmData",
    );
  }

  if (!checkChainCompatibility(srcChain, network, networkId, useMainnet)) {
    const expectedNetwork = fromChainToNetworkId(srcChain, useMainnet);
    captureAndThrowError(
      `Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`,
      "connect.ts",
      "checkAndSetEvmData",
    );
  }

  if (!getSrcChains(settings).some((x) => x.id === srcChain)) {
    captureAndThrowError(
      `Chain: ${srcChain} not supported.`,
      "connect.ts",
      "checkAndSetEvmData",
    );
  }

  const account = await retry(
    evmWalletHandler.getAddress,
    shortRetryOptions.retryCnt,
    shortRetryOptions.waitTime,
  );
  if (!account) {
    captureAndThrowError(
      "No accounts connected",
      "connect.ts",
      "checkAndSetEvmData",
    );
  }

  persistWalletName(selectedWalletName);
  handlers.onSession({
    walletName: selectedWalletName,
    account: { account, networkId, network },
  });
}

async function onEvmAccountsChanged(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
): Promise<void> {
  try {
    await checkAndSetEvmData(
      selectedWalletName,
      srcChain,
      dstChain,
      settings,
      handlers,
    );
  } catch (e) {
    const we = `Error on evm accounts changed. ${e}`;
    console.log(we);
    captureException(e, {
      tags: { component: "connect.ts", action: "onEvmAccountsChanged" },
    });
    handlers.onError?.(we);
    await disconnectWallet(handlers);
  }
}

async function enableEvmWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
) {
  const expectedChainId = fromChainToNetworkId(
    srcChain,
    shouldUseMainnet(srcChain, dstChain),
  );
  if (!expectedChainId) {
    captureAndThrowError(
      `Chain ${srcChain} not supported.`,
      "connect.ts",
      "enableEvmWallet",
    );
  }

  await evmWalletHandler.enable(
    BigInt(expectedChainId),
    () =>
      onEvmAccountsChanged(
        selectedWalletName,
        srcChain,
        dstChain,
        settings,
        handlers,
      ),
    () =>
      onEvmAccountsChanged(
        selectedWalletName,
        srcChain,
        dstChain,
        settings,
        handlers,
      ),
  );

  if (!evmWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Failed to connect to wallet.",
      "connect.ts",
      "enableEvmWallet",
    );
  }

  await checkAndSetEvmData(
    selectedWalletName,
    srcChain,
    dstChain,
    settings,
    handlers,
  );
  return true;
}

async function enableCardanoWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
) {
  await cardanoWalletHandler.enable(selectedWalletName);
  if (!cardanoWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Failed to connect to wallet.",
      "connect.ts",
      "enableCardanoWallet",
    );
  }

  const useMainnet = shouldUseMainnet(srcChain, dstChain);
  const networkId = await cardanoWalletHandler.getNetworkId();
  const network = await cardanoWalletHandler.getNetwork();
  if (!network) {
    const expectedNetwork = fromChainToNetwork(srcChain, useMainnet);
    captureAndThrowError(
      `Invalid network: ${network}. Expected network: ${expectedNetwork}. Please select ${expectedNetwork} network in your wallet.`,
      "connect.ts",
      "enableCardanoWallet",
    );
  }

  if (!checkChainCompatibility(srcChain, network, networkId, useMainnet)) {
    const expectedNetwork = fromChainToNetwork(srcChain, useMainnet);
    captureAndThrowError(
      `Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`,
      "connect.ts",
      "enableCardanoWallet",
    );
  }

  if (!getSrcChains(settings).some((x) => x.id === srcChain)) {
    captureAndThrowError(
      `Chain: ${srcChain} not supported.`,
      "connect.ts",
      "enableCardanoWallet",
    );
  }

  const account = await cardanoWalletHandler.getChangeAddress();
  persistWalletName(selectedWalletName);
  handlers.onSession({
    walletName: selectedWalletName,
    account: { account, networkId, network },
  });
  return true;
}

async function enableSolanaWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
) {
  const useMainnet = shouldUseMainnet(srcChain, dstChain);

  if (!getSrcChains(settings).some((x) => x.id === srcChain)) {
    captureAndThrowError(
      `Chain: ${srcChain} not supported.`,
      "connect.ts",
      "enableSolanaWallet",
    );
  }

  await solWalletHandler.enable(useMainnet);
  if (!solWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Failed to connect to wallet.",
      "connect.ts",
      "enableSolanaWallet",
    );
  }

  const account = solWalletHandler.getAddress();
  const networkId = fromChainToNetworkId(srcChain, useMainnet);
  const network = fromChainToNetwork(srcChain, useMainnet);

  if (networkId === undefined || network === undefined) {
    captureAndThrowError(
      `Missing Solana network mapping for chain=${srcChain}, useMainnet=${useMainnet}.`,
      "connect.ts",
      "enableSolanaWallet",
    );
  }

  persistWalletName(selectedWalletName);
  handlers.onSession({
    walletName: selectedWalletName,
    account: { account, networkId, network },
  });
  return true;
}

async function enableWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
) {
  if (isEvmChain(srcChain)) {
    try {
      return await enableEvmWallet(
        selectedWalletName,
        srcChain,
        dstChain,
        settings,
        handlers,
      );
    } catch (e) {
      console.log(e);
      captureException(e, {
        tags: { component: "connect.ts", action: "enableWallet" },
      });
      handlers.onError?.(`${e}`);
    }
    evmWalletHandler.clearEnabledWallet();
    return false;
  }

  if (isSolanaChain(srcChain)) {
    try {
      return await enableSolanaWallet(
        selectedWalletName,
        srcChain,
        dstChain,
        settings,
        handlers,
      );
    } catch (e) {
      console.log(e);
      captureException(e, {
        tags: { component: "connect.ts", action: "enableWallet" },
      });
      handlers.onError?.(`${e}`);
    }
    void solWalletHandler.disconnect();
    return false;
  }

  try {
    return await enableCardanoWallet(
      selectedWalletName,
      srcChain,
      dstChain,
      settings,
      handlers,
    );
  } catch (e) {
    console.log(e);
    captureException(e, {
      tags: { component: "connect.ts", action: "enableWallet" },
    });
    handlers.onError?.(`${e}`);
  }

  cardanoWalletHandler.clearEnabledWallet();
  return false;
}

export async function disconnectWallet(handlers?: ConnectHandlers) {
  persistWalletName(null);
  clearLegacyStoredAccount();
  cardanoWalletHandler.clearEnabledWallet();
  evmWalletHandler.clearEnabledWallet();
  await solWalletHandler.disconnect();
  handlers?.onSession(null);
}

/** Connect the first installed wallet for the source chain (MetaMask / Phantom / Eternl). */
export async function connectWallet(
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
): Promise<boolean> {
  let wallet: string | undefined;

  if (isEvmChain(srcChain)) {
    const wallets = evmWalletHandler.getInstalledWallets();
    wallet = wallets.length > 0 ? wallets[0].name : undefined;
  } else if (isSolanaChain(srcChain)) {
    const wallets = solWalletHandler.getInstalledWallets();
    wallet = wallets.length > 0 ? wallets[0].name : undefined;
  } else {
    const wallets = cardanoWalletHandler.getInstalledWallets();
    wallet = wallets.length > 0 ? wallets[0].name : undefined;
  }

  if (!wallet) {
    const supportedWallets = isEvmChain(srcChain)
      ? EVM_SUPPORTED_WALLETS.map((w) => w.name).join(", ")
      : isSolanaChain(srcChain)
        ? SOL_SUPPORTED_WALLETS.map((w) => w.name).join(", ")
        : SUPPORTED_WALLETS.join(", ");
    handlers.onError?.(
      `Can not find any supported wallets installed. Supported wallets: ${supportedWallets}`,
    );
    return false;
  }

  return enableWallet(wallet, srcChain, dstChain, settings, handlers);
}

/** Re-enable a previously selected wallet after settings load. */
export async function restoreWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
): Promise<boolean> {
  const success = await enableWallet(
    selectedWalletName,
    srcChain,
    dstChain,
    settings,
    handlers,
  );
  if (!success) {
    await disconnectWallet(handlers);
  }
  return success;
}

let onLoadCalled = false;

export async function onLoadWallet(
  selectedWalletName: string,
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
  handlers: ConnectHandlers,
): Promise<void> {
  if (onLoadCalled) {
    return;
  }

  onLoadCalled = true;

  const success = await enableWallet(
    selectedWalletName,
    srcChain,
    dstChain,
    settings,
    handlers,
  );
  if (!success) {
    await disconnectWallet(handlers);
  }
}
