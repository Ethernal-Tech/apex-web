import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DFM_UNIT, lockedTokensQueryOptions } from "@/lib/api/lockedTokens";
import { settingsQueryOptions } from "@/lib/api/settings";
import { CHAIN_META, type ChainCategory } from "@/lib/chains";
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

function addTo(totals: Totals, chain: string, tokenID: number, raw: string) {
  let value: bigint;
  try {
    value = BigInt(raw || "0");
  } catch {
    return;
  }
  const perToken = totals.get(chain) ?? new Map<number, bigint>();
  perToken.set(tokenID, (perToken.get(tokenID) ?? BigInt(0)) + value);
  totals.set(chain, perToken);
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
    for (const [chain, tokenMap] of Object.entries(lockedTokens.chains ?? {})) {
      for (const [tokenID, addressMap] of Object.entries(tokenMap ?? {})) {
        for (const amount of Object.values(addressMap ?? {})) {
          addTo(lockedTotals, chain, Number(tokenID), amount);
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
    const apexTokenID = getCurrencyID(settings, "prime");
    const keepZeros = new Set<string>();
    if (layerZeroLockedApex !== undefined && apexTokenID !== undefined) {
      addTo(lockedTotals, "nexus", apexTokenID, layerZeroLockedApex.toString());
      keepZeros.add(`nexus:${apexTokenID}`);
    }

    const bridgedTotals: Totals = new Map();
    for (const [chain, tokenMap] of Object.entries(
      lockedTokens.totalTransferred ?? {},
    )) {
      for (const [tokenID, amount] of Object.entries(tokenMap ?? {})) {
        addTo(bridgedTotals, chain, Number(tokenID), amount);
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
    for (const world of Object.values(worlds)) {
      world.summaryLocked = summarise(world.locked);
      world.summaryBridged = summarise(world.bridged);
    }

    return { worlds, isLoading: isPending };
  }, [settings, lockedTokens, layerZeroLockedApex, isPending]);
}
