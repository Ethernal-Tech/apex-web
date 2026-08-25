import { useQuery } from "@tanstack/react-query";
import { addressBalanceQueryOptions } from "@/lib/api/balance";
import type { SettingsResponse } from "@/lib/api/settings";
import { convertDfmToDisplay, toFixedAmount } from "@/lib/amount";
import { isEvmChain, isSolanaChain } from "@/lib/chains";
import {
  getCurrencyID,
  getRealTokenIDFromEntity,
  getTokenConfig,
  getTokenDisplayName,
  LovelaceTokenName,
} from "@/lib/tokens";
import { safeFetchWalletBalances } from "@/lib/wallet/balance";
import { normalizeNativeTokenKey } from "@/lib/wallet/tokenKey";
import { useWalletSession } from "@/lib/wallet/WalletSessionProvider";
import type { BridgeTransactionDto } from "@/swagger/apexBridgeApiService";

function resolveDstTokenID(
  settings: SettingsResponse,
  originChain: string,
  destinationChain: string,
  srcTokenID: number,
): number | undefined {
  const pairs =
    settings.directionConfig[originChain]?.destChain?.[destinationChain] ?? [];
  return pairs.find((p) => p.srcTokenID === srcTokenID)?.dstTokenID;
}

/** Unit to request / match in `GET /balance` for a token on a chain. */
function resolveBalanceUnit(
  settings: SettingsResponse,
  chain: string,
  tokenID: number,
): { isNative: boolean; unit?: string } {
  const currencyID = getCurrencyID(settings, chain);
  if (currencyID !== undefined && tokenID === currencyID) {
    return { isNative: true };
  }

  const config = getTokenConfig(settings, chain, tokenID);
  if (!config) return { isNative: true };

  if (config.chainSpecific === LovelaceTokenName) {
    return { isNative: true };
  }

  const unit = isEvmChain(chain)
    ? config.chainSpecific
    : isSolanaChain(chain)
      ? config.chainSpecific
      : normalizeNativeTokenKey(config.chainSpecific);

  return { isNative: false, unit };
}

function pickRawAmount(
  currAmount: string,
  tokens: { unit: string; amount: string }[],
  isNative: boolean,
  unit?: string,
): string {
  if (isNative || !unit) return currAmount;
  const hit = tokens.find(
    (t) => t.unit.toLowerCase() === unit.toLowerCase() || t.unit === unit,
  );
  return hit?.amount ?? "0";
}

export type LiveWalletBalance = {
  chain: string;
  chainLabel: string;
  address: string;
  symbol: string;
  amountDisplay: string | null;
  isLoading: boolean;
  isError: boolean;
};

/**
 * Source + destination balances for a bridging tx status view.
 * Source: connected wallet. Destination: web-api `GET /balance`.
 * Fetches once when the page loads, then again when the tx reaches a final status.
 */
export function useLiveTxBalances(params: {
  tx: BridgeTransactionDto | undefined;
  settings: SettingsResponse | undefined;
  sourceLabel: string;
  destinationLabel: string;
  /** When true, fetch a fresh snapshot (Finished / Refunded / …). */
  isFinal: boolean;
  /**
   * True after this visit saw the tx in progress - keeps balances visible
   * through finalization. False for already-final history opens.
   */
  shouldTrackBalances?: boolean;
}): {
  source: LiveWalletBalance | null;
  destination: LiveWalletBalance | null;
} {
  const {
    tx,
    settings,
    sourceLabel,
    destinationLabel,
    isFinal,
    shouldTrackBalances = false,
  } = params;
  const { account, isFullyLoggedIn } = useWalletSession();

  const srcTokenID =
    settings && tx ? getRealTokenIDFromEntity(settings, tx) : undefined;
  const dstTokenID =
    settings && tx && srcTokenID !== undefined
      ? resolveDstTokenID(
          settings,
          tx.originChain,
          tx.destinationChain,
          srcTokenID,
        )
      : undefined;

  const dstUnit =
    settings && tx && dstTokenID !== undefined
      ? resolveBalanceUnit(settings, tx.destinationChain, dstTokenID)
      : null;

  const dstTokensQuery =
    dstUnit && !dstUnit.isNative && dstUnit.unit ? [dstUnit.unit] : undefined;

  // Phase in the key so becoming final triggers one new fetch (no interval polling).
  const phase = isFinal ? "final" : "initial";

  const canFetchSourceWallet = Boolean(
    shouldTrackBalances &&
    isFullyLoggedIn &&
    account?.account &&
    tx &&
    settings &&
    srcTokenID !== undefined,
  );

  const sourceWalletQuery = useQuery({
    queryKey: [
      "liveTxSourceWalletBalance",
      tx?.originChain ?? "",
      tx?.destinationChain ?? "",
      account?.account ?? "",
      phase,
    ] as const,
    queryFn: async () => {
      const balances = await safeFetchWalletBalances(
        tx!.originChain,
        tx!.destinationChain,
        settings!,
      );
      if (!balances) {
        throw new Error("Failed to load source wallet balance");
      }
      return balances;
    },
    enabled: canFetchSourceWallet,
  });

  const destinationQuery = useQuery({
    ...addressBalanceQueryOptions({
      chain: tx?.destinationChain ?? "",
      address: tx?.receiverAddresses ?? "",
      tokens: dstTokensQuery,
      phase,
    }),
    enabled: Boolean(
      shouldTrackBalances && tx?.destinationChain && tx?.receiverAddresses,
    ),
  });

  if (!shouldTrackBalances) {
    return { source: null, destination: null };
  }

  const source: LiveWalletBalance | null = (() => {
    if (!tx || !settings || srcTokenID === undefined) return null;

    const raw = sourceWalletQuery.data
      ? (sourceWalletQuery.data[srcTokenID] ??
        sourceWalletQuery.data[String(srcTokenID)])
      : null;

    return {
      chain: tx.originChain,
      chainLabel: sourceLabel,
      address: tx.senderAddress ?? "",
      symbol: getTokenDisplayName(settings, srcTokenID),
      amountDisplay:
        raw != null
          ? toFixedAmount(convertDfmToDisplay(raw, tx.originChain), 6)
          : null,
      isLoading: canFetchSourceWallet && sourceWalletQuery.isLoading,
      isError:
        !canFetchSourceWallet ||
        sourceWalletQuery.isError ||
        (sourceWalletQuery.isSuccess && raw == null),
    };
  })();

  const destination: LiveWalletBalance | null = (() => {
    if (
      !tx ||
      !settings ||
      !tx.receiverAddresses ||
      dstTokenID === undefined ||
      !dstUnit
    ) {
      return null;
    }

    const raw = destinationQuery.data
      ? pickRawAmount(
          destinationQuery.data.amount,
          destinationQuery.data.tokens,
          dstUnit.isNative,
          dstUnit.unit,
        )
      : null;

    return {
      chain: tx.destinationChain,
      chainLabel: destinationLabel,
      address: tx.receiverAddresses,
      symbol: getTokenDisplayName(settings, dstTokenID),
      amountDisplay:
        raw != null
          ? toFixedAmount(convertDfmToDisplay(raw, tx.destinationChain), 6)
          : null,
      isLoading: destinationQuery.isLoading,
      isError: destinationQuery.isError,
    };
  })();

  return { source, destination };
}
