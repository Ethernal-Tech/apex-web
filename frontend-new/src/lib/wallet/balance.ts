import { fetchAddressBalance } from "@/lib/api/balance";
import type { SettingsResponse } from "@/lib/api/settings";
import type { SimpleUtxo } from "@/lib/cardano/utxoMinValue";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import { getCurrencyID, getTokenConfig, LovelaceTokenName } from "@/lib/tokens";
import BlockfrostRetriever from "@/lib/wallet/BlockfrostRetriever";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";
import { UtxoRetrieverEnum } from "@/lib/wallet/enums";
import { captureException } from "@/lib/wallet/errors";
import evmWalletHandler from "@/lib/wallet/evmWallet";
import OgmiosRetriever from "@/lib/wallet/OgmiosRetriever";
import solWalletHandler from "@/lib/wallet/solWallet";
import { normalizeNativeTokenKey } from "@/lib/wallet/tokenKey";
import type { UtxoRetriever } from "@/lib/wallet/utxoRetriever";
import { getUtxoRetrieverType } from "@/lib/wallet/utxoRetrieverType";
import appSettings from "@/settings/appSettings";

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

function mapSolanaApiBalanceToWalletBalances(
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

    const mint = tokenConfig.chainSpecific;
    const hit = data.tokens.find(
      (t) => t.unit === mint || t.unit.toLowerCase() === mint.toLowerCase(),
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

  return mapSolanaApiBalanceToWalletBalances(
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
    return { balance: balancesMap };
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
  const utxoRetrieverConfig =
    !!appSettings.utxoRetriever && appSettings.utxoRetriever[srcChain];

  let utxoRetriever: UtxoRetriever = cardanoWalletHandler;
  let utxos: SimpleUtxo[] | undefined;
  let balance: Record<string, bigint>;

  if (utxoRetrieverType === UtxoRetrieverEnum.Wallet) {
    // CIP-30 getBalance Value CBOR — no UTXO address decode for display.
    balance = await cardanoWalletHandler.getBalance();
  } else {
    const addr = await cardanoWalletHandler.getChangeAddress();
    if (utxoRetrieverType === UtxoRetrieverEnum.Blockfrost) {
      utxoRetriever = new BlockfrostRetriever(
        addr,
        utxoRetrieverConfig!.url,
        utxoRetrieverConfig!.dmtrApiKey,
      );
    } else {
      utxoRetriever = new OgmiosRetriever(addr, utxoRetrieverConfig!.url);
    }
    utxos = await utxoRetriever.getAllUtxos();
    balance = await utxoRetriever.getBalance(utxos);
  }

  const finalBalance: WalletBalances = dirTokens.reduce(
    (acc: WalletBalances, cv: number) => {
      acc[cv.toString()] = (
        balance[
          cv === currencyID
            ? LovelaceTokenName
            : normalizeNativeTokenKey(
                getTokenConfig(settings, srcChain, cv)!.chainSpecific,
              )
        ] || BigInt(0)
      ).toString(10);

      return acc;
    },
    {},
  );

  return {
    balance: finalBalance,
    utxos,
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
