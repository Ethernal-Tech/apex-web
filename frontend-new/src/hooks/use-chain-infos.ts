import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  chainInfosQueryOptions,
  type ChainInfosResponse,
} from "@/lib/api/chainInfo";
import {
  chainMetaFrom,
  DEFAULT_CHAIN_COLOR,
  listChainsFrom,
  toChainInfoLookup,
  type ChainMeta,
} from "@/lib/chains";

/** chain id -> accent color to paint that chain in. */
export type ChainColorOf = (chain: string) => string;

/** chain id -> everything the UI needs to draw that chain. */
export type ChainMetaOf = (chain: string) => ChainMeta;

/**
 * The raw `GET /chainInfo` payload. Components normally want useChainMeta or
 * useChainColor instead; this is for the memos that call the synchronous helpers
 * in lib/chains.ts and so need the payload in their dependency list to recompute
 * once it lands.
 */
export function useChainInfos(): ChainInfosResponse | undefined {
  return useQuery(chainInfosQueryOptions).data;
}

/**
 * Chain accent colors from `GET /chainInfo`, so the palette lives in the
 * web-api's chainInfos config rather than in the pages that draw it.
 *
 * A chain the config does not list falls back to its `unknownChain` color, and
 * to DEFAULT_CHAIN_COLOR while the request is still in flight.
 */
export function useChainColor(): ChainColorOf {
  const data = useChainInfos();

  return useMemo(() => {
    const byChain = new Map(
      (data?.chains ?? []).map((info) => [info.chain, info.color] as const),
    );
    const fallback = data?.unknownChain?.color ?? DEFAULT_CHAIN_COLOR;
    return (chain: string) => byChain.get(chain.toLowerCase()) ?? fallback;
  }, [data]);
}

/**
 * Chain display metadata - name, logo, order, family, symbol - from
 * `GET /chainInfo`, so none of it is hardcoded in the pages that draw it.
 *
 * Every field falls back on its own (see chainMetaFrom), so this always returns
 * something drawable: while the request is in flight a chain reads as its
 * capitalized id with the unknown-chain logo.
 */
export function useChainMeta(): ChainMetaOf {
  const data = useChainInfos();

  return useMemo(() => {
    const lookup = toChainInfoLookup(data);
    return (chain: string) => chainMetaFrom(lookup, chain);
  }, [data]);
}

/**
 * Every chain `GET /chainInfo` lists, in its configured order - the chain set the
 * transaction filters offer, which is every known chain rather than the ones a
 * particular bridge route enables.
 */
export function useChainList(): Array<{ id: string } & ChainMeta> {
  const data = useChainInfos();

  return useMemo(() => listChainsFrom(toChainInfoLookup(data)), [data]);
}
