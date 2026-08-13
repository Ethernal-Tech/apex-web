import { fetchAddressBalance } from "@/lib/api/balance";
import type { SettingsResponse } from "@/lib/api/settings";
import type { SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import { getCurrencyID, getTokenConfig, LovelaceTokenName } from "@/lib/tokens";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";
import { UtxoRetrieverEnum } from "@/lib/wallet/enums";
import { captureException } from "@/lib/wallet/errors";
import evmWalletHandler from "@/lib/wallet/evmWallet";
import solWalletHandler from "@/lib/wallet/solWallet";
import { normalizeNativeTokenKey } from "@/lib/wallet/tokenKey";
import { getUtxoRetrieverType } from "@/lib/wallet/utxoRetrieverType";

/** tokenID → raw smallest-unit amount string (wei / lovelace / lamports). */
export type WalletBalances = Record<string, string>;

export type WalletBalanceState = {
  balance: WalletBalances;
  utxos?: SimpleUtxo[];
};

const WALLET_UPDATE_BALANCE_INTERVAL = 5000;
const SOLANA_WALLET_UPDATE_BALANCE_INTERVAL = 10000;
const DEFAULT_UPDATE_BALANCE_INTERVAL = 30000;

export function getUpdateBalanceInterval(srcChain: string | undefined): number {
  if (!srcChain || isSolanaChain(srcChain)) {
    return SOLANA_WALLET_UPDATE_BALANCE_INTERVAL;
  }

  return getUtxoRetrieverType(srcChain) === UtxoRetrieverEnum.Wallet
    ? WALLET_UPDATE_BALANCE_INTERVAL
    : DEFAULT_UPDATE_BALANCE_INTERVAL;
}

function mapApiBalanceToWalletBalances(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
  data: { amount: string; tokens: { unit: string; amount: string }[] },
): WalletBalances {
  const finalBalance: WalletBalances = {};
  for (const tokenID of dirTokens) {
    const tokenConfig = getTokenConfig(settings, srcChain, tokenID);
    const isCurrencyToken = currencyID !== undefined && tokenID === currencyID;
    if (
      !tokenConfig ||
      tokenConfig.chainSpecific === LovelaceTokenName ||
      isCurrencyToken
    ) {
      finalBalance[tokenID.toString()] = data.amount ?? "0";
      continue;
    }

    const asset = tokenConfig.chainSpecific;
    const hit = data.tokens.find(
      (t) => t.unit === asset || t.unit.toLowerCase() === asset.toLowerCase(),
    );
    finalBalance[tokenID.toString()] = hit?.amount ?? "0";
  }
  return finalBalance;
}

async function fetchSolanaBalancesFromRpc(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  const hasSplTokens = dirTokens.some((tokenID) => {
    const tokenConfig = getTokenConfig(settings, srcChain, tokenID);
    return tokenConfig && tokenConfig.chainSpecific !== LovelaceTokenName;
  });

  const [nativeLamports, splByMint] = await Promise.all([
    solWalletHandler.getBalanceLamports(),
    hasSplTokens
      ? solWalletHandler.getSplTokenBalancesByMint()
      : Promise.resolve({} as Record<string, bigint>),
  ]);

  const finalBalance: WalletBalances = {};
  for (const tokenID of dirTokens) {
    const tokenConfig = getTokenConfig(settings, srcChain, tokenID);
    const isCurrencyToken = currencyID !== undefined && tokenID === currencyID;
    if (!tokenConfig) {
      finalBalance[tokenID.toString()] = isCurrencyToken
        ? nativeLamports.toString(10)
        : "0";
      continue;
    }

    if (tokenConfig.chainSpecific === LovelaceTokenName) {
      finalBalance[tokenID.toString()] = nativeLamports.toString(10);
    } else {
      finalBalance[tokenID.toString()] = (
        splByMint[tokenConfig.chainSpecific] ?? BigInt(0)
      ).toString(10);
    }
  }

  return finalBalance;
}

async function fetchSolanaBalancesFromBackend(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  const address = solWalletHandler.getAddress();
  const splMints = dirTokens
    .map((tokenID) => getTokenConfig(settings, srcChain, tokenID))
    .filter(
      (config): config is NonNullable<typeof config> =>
        !!config && config.chainSpecific !== LovelaceTokenName,
    )
    .map((config) => config.chainSpecific);

  const data = await fetchAddressBalance({
    chain: srcChain,
    address,
    tokens: splMints.length > 0 ? splMints : undefined,
  });

  return mapApiBalanceToWalletBalances(
    settings,
    srcChain,
    dirTokens,
    currencyID,
    data,
  );
}

/** Solana: RPC first, web-api fallback, then throw. */
async function fetchSolanaWalletBalances(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  try {
    return await fetchSolanaBalancesFromRpc(
      settings,
      srcChain,
      dirTokens,
      currencyID,
    );
  } catch (rpcError) {
    console.log(
      `Solana RPC balance failed, falling back to web-api: ${rpcError}`,
    );
    captureException(rpcError, {
      tags: {
        component: "balance.ts",
        action: "fetchSolanaBalancesFromRpc",
      },
    });

    try {
      return await fetchSolanaBalancesFromBackend(
        settings,
        srcChain,
        dirTokens,
        currencyID,
      );
    } catch (apiError) {
      console.log(`Solana web-api balance fallback failed: ${apiError}`);
      captureException(apiError, {
        tags: {
          component: "balance.ts",
          action: "fetchSolanaBalancesFromBackend",
        },
      });
      throw apiError;
    }
  }
}

async function fetchEvmBalancesFromWallet(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  const promises = dirTokens.map((tokenID) =>
    tokenID === currencyID
      ? evmWalletHandler.getBalance()
      : evmWalletHandler.getERC20Balance(
          getTokenConfig(settings, srcChain, tokenID)!.chainSpecific,
        ),
  );
  const balances = await Promise.all(promises);
  const balancesMap: WalletBalances = {};
  for (let i = 0; i < dirTokens.length; ++i) {
    balancesMap[dirTokens[i]] = balances[i];
  }
  return balancesMap;
}

async function fetchEvmBalancesFromBackend(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  const address = await evmWalletHandler.getAddress();
  if (!address) {
    throw new Error("No connected wallet address.");
  }

  const erc20Addresses = dirTokens
    .filter((tokenID) => tokenID !== currencyID)
    .map((tokenID) => getTokenConfig(settings, srcChain, tokenID))
    .filter(
      (config): config is NonNullable<typeof config> =>
        !!config && config.chainSpecific !== LovelaceTokenName,
    )
    .map((config) => config.chainSpecific);

  const data = await fetchAddressBalance({
    chain: srcChain,
    address,
    tokens: erc20Addresses.length > 0 ? erc20Addresses : undefined,
  });

  return mapApiBalanceToWalletBalances(
    settings,
    srcChain,
    dirTokens,
    currencyID,
    data,
  );
}

/** EVM: MetaMask first, web-api fallback, then throw. */
async function fetchEvmWalletBalances(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  try {
    return await fetchEvmBalancesFromWallet(
      settings,
      srcChain,
      dirTokens,
      currencyID,
    );
  } catch (walletError) {
    console.log(
      `EVM wallet balance failed, falling back to web-api: ${walletError}`,
    );
    captureException(walletError, {
      tags: {
        component: "balance.ts",
        action: "fetchEvmBalancesFromWallet",
      },
    });

    try {
      return await fetchEvmBalancesFromBackend(
        settings,
        srcChain,
        dirTokens,
        currencyID,
      );
    } catch (apiError) {
      console.log(`EVM web-api balance fallback failed: ${apiError}`);
      captureException(apiError, {
        tags: {
          component: "balance.ts",
          action: "fetchEvmBalancesFromBackend",
        },
      });
      throw apiError;
    }
  }
}

function mapCardanoAssetMapToWalletBalances(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
  assets: Record<string, string>,
): WalletBalances {
  return dirTokens.reduce((acc: WalletBalances, tokenID: number) => {
    const unit =
      tokenID === currencyID
        ? LovelaceTokenName
        : normalizeNativeTokenKey(
            getTokenConfig(settings, srcChain, tokenID)!.chainSpecific,
          );
    acc[tokenID.toString()] = assets[unit] || "0";
    return acc;
  }, {});
}

async function fetchCardanoBalancesFromBackend(
  settings: SettingsResponse,
  srcChain: string,
  dirTokens: number[],
  currencyID: number | undefined,
): Promise<WalletBalances> {
  const address = await cardanoWalletHandler.getChangeAddress();
  const data = await fetchAddressBalance({
    chain: srcChain,
    address,
  });

  const assets: Record<string, string> = {
    [LovelaceTokenName]: data.amount ?? "0",
  };
  for (const token of data.tokens) {
    assets[token.unit] = token.amount;
  }

  return mapCardanoAssetMapToWalletBalances(
    settings,
    srcChain,
    dirTokens,
    currencyID,
    assets,
  );
}

export async function fetchWalletBalances(
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
): Promise<WalletBalanceState> {
  const currencyID = getCurrencyID(settings, srcChain);
  const dirTokens = (
    settings.directionConfig[srcChain]?.destChain?.[dstChain] ?? []
  ).map((x) => x.srcTokenID);

  if (currencyID !== undefined && !dirTokens.includes(currencyID)) {
    dirTokens.push(currencyID);
  }

  if (isEvmChain(srcChain)) {
    return {
      balance: await fetchEvmWalletBalances(
        settings,
        srcChain,
        dirTokens,
        currencyID,
      ),
    };
  }

  if (isSolanaChain(srcChain)) {
    return {
      balance: await fetchSolanaWalletBalances(
        settings,
        srcChain,
        dirTokens,
        currencyID,
      ),
    };
  }

  const utxoRetrieverType = getUtxoRetrieverType(srcChain);

  if (utxoRetrieverType === UtxoRetrieverEnum.Wallet) {
    try {
      const balance = await cardanoWalletHandler.getBalance();
      const assets: Record<string, string> = {};
      for (const [unit, amount] of Object.entries(balance)) {
        assets[unit] = amount.toString(10);
      }
      return {
        balance: mapCardanoAssetMapToWalletBalances(
          settings,
          srcChain,
          dirTokens,
          currencyID,
          assets,
        ),
      };
    } catch (walletError) {
      console.log(
        `Cardano wallet balance failed, falling back to web-api: ${walletError}`,
      );
      captureException(walletError, {
        tags: {
          component: "balance.ts",
          action: "fetchCardanoBalancesFromWallet",
        },
      });
    }
  }

  return {
    balance: await fetchCardanoBalancesFromBackend(
      settings,
      srcChain,
      dirTokens,
      currencyID,
    ),
  };
}

export async function safeFetchWalletBalances(
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
): Promise<WalletBalances | null> {
  try {
    const state = await fetchWalletBalances(srcChain, dstChain, settings);
    return state.balance;
  } catch (e) {
    console.log(`Error while fetching wallet balance: ${e}`);
    captureException(e, {
      tags: { component: "balance.ts", action: "safeFetchWalletBalances" },
    });
    return null;
  }
}
