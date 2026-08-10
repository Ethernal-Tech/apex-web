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
      const isCurrencyToken =
        currencyID !== undefined && tokenID === currencyID;
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

    return { balance: finalBalance };
  }

  let utxoRetriever: UtxoRetriever = cardanoWalletHandler;
  const addr = await cardanoWalletHandler.getChangeAddress();
  const utxoRetrieverConfig =
    !!appSettings.utxoRetriever && appSettings.utxoRetriever[srcChain];

  const utxoRetrieverType = getUtxoRetrieverType(srcChain);

  if (utxoRetrieverType === UtxoRetrieverEnum.Blockfrost) {
    utxoRetriever = new BlockfrostRetriever(
      addr,
      utxoRetrieverConfig!.url,
      utxoRetrieverConfig!.dmtrApiKey,
    );
  } else if (utxoRetrieverType === UtxoRetrieverEnum.Ogmios) {
    utxoRetriever = new OgmiosRetriever(addr, utxoRetrieverConfig!.url);
  }

  const utxos = await utxoRetriever.getAllUtxos();
  const balance = await utxoRetriever.getBalance(utxos);

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
