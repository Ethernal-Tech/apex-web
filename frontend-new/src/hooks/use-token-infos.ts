import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { tokenInfosQueryOptions } from "@/lib/api/tokenInfo";
import { DEFAULT_TOKEN_COLOR } from "@/lib/tokens";

/** tokenID -> accent color to paint that token in. */
export type TokenColorOf = (tokenID: number) => string;

/**
 * Token accent colors from `GET /tokenInfo`, so the palette lives in the
 * web-api's tokenInfos config rather than in the pages that draw it.
 *
 * A token the config gives no color falls back to the config's `unknownToken`
 * color, and to DEFAULT_TOKEN_COLOR while the request is still in flight.
 */
export function useTokenColor(): TokenColorOf {
  const { data } = useQuery(tokenInfosQueryOptions);

  return useMemo(() => {
    const byId = new Map(
      (data?.tokens ?? []).flatMap((token) =>
        token.color ? [[token.tokenID, token.color] as const] : [],
      ),
    );
    const fallback = data?.unknownToken?.color ?? DEFAULT_TOKEN_COLOR;
    return (tokenID: number) => byId.get(tokenID) ?? fallback;
  }, [data]);
}
