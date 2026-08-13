import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DFM_UNIT, lockedTokensQueryOptions } from "@/lib/api/lockedTokens";
import { settingsQueryOptions } from "@/lib/api/settings";
import {
  CHAIN_META,
  isUnreportedChain,
  type ChainCategory,
} from "@/lib/chains";
import { getCurrencyID, getTokenDisplayName } from "@/lib/tokens";
import { useLayerZeroLockedApex } from "./use-bridge-stats";

/** One token's balance on one chain, in whole tokens. */
export type TokenRow = {
  tokenID: number;
  /** Ecosystem token name from the settings (AP3X, cAP3X, xADA, ...). */
  name: string;
  amount: number;
};

export type ChainRows = {
  chain: string;
  label: string;
  rows: TokenRow[];
};

/** Everything one holder address holds on one chain. */
export type AddressRows = {
  address: string;
  rows: TokenRow[];
};

/** The addresses one chain's locked funds actually sit in. */
export type ChainAddressRows = {
  chain: string;
  label: string;
  addresses: AddressRows[];
};

/** The chain families the audit page shows as tabs. */
export type WorldKey = Extract<ChainCategory, "utxo" | "evm" | "svm">;
export const WORLD_KEYS: WorldKey[] = ["utxo", "evm", "svm"];

export type WorldBreakdown = {
  key: WorldKey;
  /** Chains in this world that hold something, in CHAIN_META order. */
  locked: ChainRows[];
  bridged: ChainRows[];
  /** Per token, summed across the world's chains. */
  summaryLocked: TokenRow[];
  summaryBridged: TokenRow[];
  /**
   * The same locked balances as `locked`, broken down by the address holding
   * them - the bridging addresses on a UTxO chain, the native token wallet on an
   * EVM one, the token accounts on Solana. In CHAIN_META order.
   */
  holders: ChainAddressRows[];
};

export type LockedBreakdown = {
  worlds: Record<WorldKey, WorldBreakdown>;
  isLoading: boolean;
};

const emptyWorld = (key: WorldKey): WorldBreakdown => ({
  key,
  locked: [],
  bridged: [],
  summaryLocked: [],
  summaryBridged: [],
  holders: [],
});

const emptyWorlds = (): Record<WorldKey, WorldBreakdown> => ({
  utxo: emptyWorld("utxo"),
  evm: emptyWorld("evm"),
  svm: emptyWorld("svm"),
});

/**
 * A chain CHAIN_META does not know yet still has to land somewhere, and new
 * chains are EVM rollups far more often than not - so it shows there, labelled
 * by its raw id, rather than being silently dropped from the audit.
 */
const worldOf = (chain: string): WorldKey => {
  const category = CHAIN_META[chain]?.category;
  return category && (WORLD_KEYS as string[]).includes(category)
    ? (category as WorldKey)
    : "evm";
};

/** Sums per chain -> tokenID, dropping the addresses the API breaks locked amounts by. */
type Totals = Map<string, Map<number, bigint>>;

/** Sums per chain -> address -> tokenID, keeping them. */
type HolderTotals = Map<string, Map<string, Map<number, bigint>>>;

/** Undefined for an amount the API served in a shape BigInt cannot read. */
function toAmount(raw: string): bigint | undefined {
  try {
    return BigInt(raw || "0");
  } catch {
    return undefined;
  }
}

function addTo(
  totals: Totals,
  chain: string,
  tokenID: number,
  value: bigint,
): void {
  const perToken = totals.get(chain) ?? new Map<number, bigint>();
  perToken.set(tokenID, (perToken.get(tokenID) ?? BigInt(0)) + value);
  totals.set(chain, perToken);
}

function addToHolder(
  totals: HolderTotals,
  chain: string,
  address: string,
  tokenID: number,
  value: bigint,
): void {
  const byAddress = totals.get(chain) ?? new Map<string, Map<number, bigint>>();
  const perToken = byAddress.get(address) ?? new Map<number, bigint>();
  perToken.set(tokenID, (perToken.get(tokenID) ?? BigInt(0)) + value);
  byAddress.set(address, perToken);
  totals.set(chain, byAddress);
}

/**
 * Locked and bridged token amounts per chain, straight from `GET /lockedTokens`,
 * grouped into the page's three worlds by the chain's category.
 *
 * Zero balances are dropped, and a chain with nothing left is dropped with
 * them - so a world can legitimately come back empty.
 */
export function useLockedBreakdown(): LockedBreakdown {
  const { data: settings } = useQuery(settingsQueryOptions);
  const { data: lockedTokens, isPending } = useQuery(lockedTokensQueryOptions);
  const layerZeroLockedApex = useLayerZeroLockedApex();

  return useMemo(() => {
    if (!lockedTokens) {
      return { worlds: emptyWorlds(), isLoading: isPending };
    }

    const lockedTotals: Totals = new Map();
    const holderTotals: HolderTotals = new Map();
    for (const [chain, tokenMap] of Object.entries(lockedTokens.chains ?? {})) {
      // Dropped here rather than further down, so an unreported chain reaches
      // neither a card nor a chart nor the per-token summaries.
      if (isUnreportedChain(chain)) continue;
      for (const [tokenID, addressMap] of Object.entries(tokenMap ?? {})) {
        for (const [address, amount] of Object.entries(addressMap ?? {})) {
          const value = toAmount(amount);
          if (value === undefined) continue;
          addTo(lockedTotals, chain, Number(tokenID), value);
          addToHolder(holderTotals, chain, address, Number(tokenID), value);
        }
      }
    }

    /**
     * The OFT balance is the only thing an EVM chain locks - everywhere else
     * the bridge mints wrapped tokens against collateral held on the UTxO
     * chains, which is why `chains` above never names an EVM chain. Kept even
     * at zero, the way the old frontend's EVM panel did: "nothing is held
     * there" is an audit statement, not a missing value.
     */
    const apexTokenID = settings ? getCurrencyID(settings, "prime") : undefined;
    const keepZeros = new Set<string>();
    if (layerZeroLockedApex !== undefined && apexTokenID !== undefined) {
      addTo(lockedTotals, "nexus", apexTokenID, layerZeroLockedApex);
      keepZeros.add(`nexus:${apexTokenID}`);
      // The contract itself is the holder, so the per-address view can account
      // for this balance the way it accounts for every other one.
      const oftAddress = settings?.layerZeroChains?.nexus?.oftAddress;
      if (oftAddress) {
        addToHolder(
          holderTotals,
          "nexus",
          oftAddress,
          apexTokenID,
          layerZeroLockedApex,
        );
      }
    }

    const bridgedTotals: Totals = new Map();
    for (const [chain, tokenMap] of Object.entries(
      lockedTokens.totalTransferred ?? {},
    )) {
      if (isUnreportedChain(chain)) continue;
      for (const [tokenID, amount] of Object.entries(tokenMap ?? {})) {
        const value = toAmount(amount);
        if (value === undefined) continue;
        addTo(bridgedTotals, chain, Number(tokenID), value);
      }
    }

    const toChainRows = (
      totals: Totals,
      keep: Set<string> = new Set(),
    ): ChainRows[] =>
      [...totals.entries()]
        .map(([chain, perToken]) => ({
          chain,
          label: CHAIN_META[chain]?.label ?? chain,
          rows: [...perToken.entries()]
            .filter(
              ([tokenID, amount]) =>
                amount > BigInt(0) || keep.has(`${chain}:${tokenID}`),
            )
            .map(([tokenID, amount]) => ({
              tokenID,
              name: getTokenDisplayName(settings, tokenID),
              amount: Number(amount) / DFM_UNIT,
            }))
            .sort((a, b) => a.tokenID - b.tokenID),
        }))
        .filter((entry) => entry.rows.length > 0)
        .sort(
          (a, b) =>
            (CHAIN_META[a.chain]?.order ?? 99) -
            (CHAIN_META[b.chain]?.order ?? 99),
        );

    /**
     * The same balances as toChainRows, split by holder instead of summed.
     *
     * An address holding nothing is not a holder, so a zero row drops out and an
     * address left with none drops with it - including the EVM native token
     * wallets the API reports at zero, which the chain cards already omit.
     */
    const toChainAddressRows = (totals: HolderTotals): ChainAddressRows[] =>
      [...totals.entries()]
        .map(([chain, byAddress]) => ({
          chain,
          label: CHAIN_META[chain]?.label ?? chain,
          addresses: [...byAddress.entries()]
            .map(([address, perToken]) => ({
              address,
              rows: [...perToken.entries()]
                .filter(([, amount]) => amount > BigInt(0))
                .map(([tokenID, amount]) => ({
                  tokenID,
                  name: getTokenDisplayName(settings, tokenID),
                  amount: Number(amount) / DFM_UNIT,
                }))
                .sort((a, b) => a.tokenID - b.tokenID),
            }))
            .filter((holder) => holder.rows.length > 0)
            // Stable order for the page to re-sort by value once prices land.
            .sort((a, b) => a.address.localeCompare(b.address)),
        }))
        .filter((entry) => entry.addresses.length > 0)
        .sort(
          (a, b) =>
            (CHAIN_META[a.chain]?.order ?? 99) -
            (CHAIN_META[b.chain]?.order ?? 99),
        );

    /** One row per token, summed over the chains of a world. */
    const summarise = (chains: ChainRows[]): TokenRow[] => {
      const byToken = new Map<number, TokenRow>();
      for (const { rows } of chains) {
        for (const row of rows) {
          const existing = byToken.get(row.tokenID);
          if (existing) {
            existing.amount += row.amount;
          } else {
            byToken.set(row.tokenID, { ...row });
          }
        }
      }
      return [...byToken.values()].sort((a, b) => a.tokenID - b.tokenID);
    };

    const worlds = emptyWorlds();
    for (const chainRows of toChainRows(lockedTotals, keepZeros)) {
      worlds[worldOf(chainRows.chain)].locked.push(chainRows);
    }
    for (const chainRows of toChainRows(bridgedTotals)) {
      worlds[worldOf(chainRows.chain)].bridged.push(chainRows);
    }
    for (const chainAddresses of toChainAddressRows(holderTotals)) {
      worlds[worldOf(chainAddresses.chain)].holders.push(chainAddresses);
    }
    for (const world of Object.values(worlds)) {
      world.summaryLocked = summarise(world.locked);
      world.summaryBridged = summarise(world.bridged);
    }

    return { worlds, isLoading: isPending };
  }, [settings, lockedTokens, layerZeroLockedApex, isPending]);
}
