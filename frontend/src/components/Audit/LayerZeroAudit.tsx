import React, { useMemo} from "react";
import { Box, Typography } from "@mui/material";
import { isEvmChain } from "../../settings/chain";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { getLayerZeroWrappedToken } from "../../settings/token";
import { formatBigIntDecimalString } from "../lockedTokens/LockedTokensComponent";
import "../../audit.css"
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

type LayerZeroPanelProps = {
  lzPerChainTotals: Record<string, Record<string, bigint>>;
  lzTokenTotalsAllChains: Record<string, bigint>;
  lzGrandTotal: bigint;
};

function decodeTokenKey(tokenKey: string): string {
  if (tokenKey === "lovelace" || tokenKey === "amount") return "AP3X";
  return tokenKey;
}

/* ---------------- Component ---------------- */
const LayerZeroPanel: React.FC<LayerZeroPanelProps> = ({
  lzPerChainTotals,
  lzTokenTotalsAllChains,
  lzGrandTotal,
}) => {
  const layerZeroLockedTokens = useSelector((state: RootState) => state.layerZeroLockedTokens);
  const layerZeroSupply = layerZeroLockedTokens.lockedTokens;
  
  const totalLayerZero = useMemo(() =>  {
    let layerZeroSum = BigInt(0);
    for (const v of layerZeroSupply) {
      layerZeroSum +=v.raw;
    }

    return layerZeroSum
  }, [layerZeroSupply])

  return (
    <Box className="audit-layout-2col">
      {/* LEFT — Token Supply (ERC-20) */}
      <Box>
        <Typography className="audit-h2">Token Supply (ERC-20)</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <Box className="audit-card">
            <Box className="audit-card-content audit-row">
              <Typography>AP3X</Typography>
              <Typography className="audit-amount">{formatBigIntDecimalString(totalLayerZero, 18)}</Typography>
            </Box>
          </Box>
        </Box>

        {/* By Chain -> two-per-row on md+ */}
        <Typography className="audit-h2">By Chain</Typography>
        <Box className="audit-grid-md-2 audit-gap-12">
          {layerZeroSupply.map((row) => (
            <Box key={row.chain} className="audit-card">
              <Box className="audit-card-content">
                <Typography className="audit-card-subtitle">
                  {row.chain.toUpperCase()}
                </Typography>
                <Box className="audit-row audit-my-4" key={row.symbol}>
                  <Typography>{row.symbol}</Typography>
                  <Typography className="audit-amount">{row.formatted}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT — LayerZero transfers (existing UI) */}
      <Box>
        <Typography className="audit-h2">LayerZero transfers</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <Box className="audit-card">
            <Box className="audit-card-content audit-row">
              <Typography>AP3X</Typography>
              <Typography className="audit-amount">
                {formatBigIntDecimalString(lzGrandTotal, 6)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* By Coin — two-per-row on md+ */}
        <Typography className="audit-h2">By Coin</Typography>
        <Box className="audit-grid-md-2 audit-gap-12 audit-mb-16">
          {Object.entries(lzTokenTotalsAllChains)
            .sort((a, b) => Number(b[1] - a[1]))
            .map(([tk, amt]) => (
              <Box key={tk} className="audit-card">
                <Box className="audit-card-content audit-row">
                  <Typography className="fw-700">{decodeTokenKey(tk)}</Typography>
                  <Typography className="audit-amount">
                    {formatBigIntDecimalString(amt, 6)}
                  </Typography>
                </Box>
              </Box>
            ))}
          {Object.keys(lzTokenTotalsAllChains).length === 0 && (
            <Typography className="audit-dim">No transfers yet.</Typography>
          )}
        </Box>

        {/* By Chain — two-per-row on md+ (only EVM chains per your filter) */}
        <Typography className="audit-h2">By Chain</Typography>
        <Box className="audit-grid-md-2 audit-gap-12">
          {Object.keys(lzPerChainTotals)
            .filter((ck) => isEvmChain(ck as ChainEnum))
            .map((ck) => {
              const rows = Object.entries(lzPerChainTotals[ck] ?? {})
                .sort((a, b) => Number(b[1] - a[1]))
                .map(([token, amt]) => ({ token: decodeTokenKey(token), amt }));
              return (
                <Box key={ck} className="audit-card">
                  <Box className="audit-card-content">
                    <Typography className="audit-card-subtitle">
                      {ck.toUpperCase()}
                    </Typography>
                    {rows.length === 0 && (
                      <Typography className="audit-dim">No data</Typography>
                    )}
                    {rows.map((r) => (
                      <Box key={r.token} className="audit-row audit-my-4">
                        <Typography>
                          {getLayerZeroWrappedToken(ck as ChainEnum)}
                        </Typography>
                        <Typography className="audit-amount">
                          {formatBigIntDecimalString(r.amt, 6)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          {Object.keys(lzPerChainTotals).length === 0 && (
            <Typography className="audit-dim">No transfers yet.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LayerZeroPanel;
