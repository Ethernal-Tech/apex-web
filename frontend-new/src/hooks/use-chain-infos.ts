import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { chainInfosQueryOptions } from "@/lib/api/chainInfo";
import { DEFAULT_CHAIN_COLOR } from "@/lib/chains";

/** chain id -> accent color to paint that chain in. */
export type ChainColorOf = (chain: string) => string;

/**
 * Chain accent colors from `GET /chainInfo`, so the palette lives in the
 * web-api's chainInfos config rather than in the pages that draw it.
 *
 * A chain the config does not list falls back to its `unknownChain` color, and
 * to DEFAULT_CHAIN_COLOR while the request is still in flight.
 */
export function useChainColor(): ChainColorOf {
  const { data } = useQuery(chainInfosQueryOptions);

  return useMemo(() => {
    const byChain = new Map(
      (data?.chains ?? []).map((info) => [info.chain, info.color] as const),
    );
    const fallback = data?.unknownChain?.color ?? DEFAULT_CHAIN_COLOR;
    return (chain: string) => byChain.get(chain.toLowerCase()) ?? fallback;
  }, [data]);
}
