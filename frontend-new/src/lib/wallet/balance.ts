import type { SettingsResponse } from "@/lib/api/settings";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import { getCurrencyID, getTokenConfig, LovelaceTokenName } from "@/lib/tokens";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";
import { captureException } from "@/lib/wallet/errors";
import evmWalletHandler from "@/lib/wallet/evmWallet";
import solWalletHandler from "@/lib/wallet/solWallet";
import { normalizeNativeTokenKey } from "@/lib/wallet/tokenKey";

/** tokenID → raw smallest-unit amount string (wei / lovelace / lamports). */
export type WalletBalances = Record<string, string>;

const WALLET_UPDATE_BALANCE_INTERVAL = 5000;
const SOLANA_WALLET_UPDATE_BALANCE_INTERVAL = 10000;

export function getUpdateBalanceInterval(srcChain: string | undefined): number {
  if (!srcChain || isSolanaChain(srcChain)) {
    return SOLANA_WALLET_UPDATE_BALANCE_INTERVAL;
  }
  return WALLET_UPDATE_BALANCE_INTERVAL;
}

export async function fetchWalletBalances(
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
): Promise<WalletBalances> {
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
    return balancesMap;
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
    return finalBalance;
  }

  const balance = await cardanoWalletHandler.getBalance();
  return dirTokens.reduce((acc: WalletBalances, cv: number) => {
    const key =
      cv === currencyID
        ? LovelaceTokenName
        : normalizeNativeTokenKey(
            getTokenConfig(settings, srcChain, cv)!.chainSpecific,
          );
    acc[cv.toString()] = (balance[key] || BigInt(0)).toString(10);
    return acc;
  }, {});
}

export async function safeFetchWalletBalances(
  srcChain: string,
  dstChain: string,
  settings: SettingsResponse,
): Promise<WalletBalances | null> {
  try {
    return await fetchWalletBalances(srcChain, dstChain, settings);
  } catch (e) {
    console.log(`Error while fetching wallet balance: ${e}`);
    captureException(e, {
      tags: { component: "balance.ts", action: "safeFetchWalletBalances" },
    });
    return null;
  }
}
