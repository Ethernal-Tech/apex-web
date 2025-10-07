import React from "react";
import { Box, Typography } from "@mui/material";
import { isEvmChain } from "../../settings/chain";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { getLayerZeroWrappedToken, getTokenInfo } from "../../settings/token";
import { formatBigIntDecimalString } from "../lockedTokens/LockedTokensComponent";
import "../../audit.css";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { layerZeroChain, openAuditExplorer } from "../../utils/chainUtils";
import ButtonCustom from "../Buttons/ButtonCustom";
import explorerPng from "@../../../public/explorer.png";
import { decodeTokenKey } from "../../utils/tokenUtils";
import { TokenEnum } from "../../features/enums";

type LayerZeroPanelProps = {
  lzPerChainTotals: Record<string, Record<string, bigint>>;
  lzTokenTotalsAllChains: Record<string, bigint>;
  lzGrandTotal: bigint;
};

/* ---------------- Component ---------------- */
const LayerZeroPanel: React.FC<LayerZeroPanelProps> = ({
  lzPerChainTotals,
  lzTokenTotalsAllChains,
  lzGrandTotal,
}) => {
  const layerZeroLockedTokens = useSelector(
    (state: RootState) => state.layerZeroLockedTokens
  );
  const layerZeroLocked = layerZeroLockedTokens.lockedTokens;
  const { layerZeroChains } = useSelector((state: RootState) => state.settings);
  
  return (
    <Box className="audit-layout-2col">
      {/* LEFT — Token Supply (ERC-20) */}
      <Box>
        <Typography className="audit-h2"> Locked Tokens</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <Box className="audit-card">
            <Box className="audit-card-content audit-row">
              <Typography>{getTokenInfo(TokenEnum.APEX).label}</Typography>
              <Typography className="audit-amount">
                {formatBigIntDecimalString(layerZeroLocked, 18)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography className="audit-h2">
          Layer Zero Chains Explorers
        </Typography>
        <Box className="audit-grid-3">
          {layerZeroChain().map((chain) => {
            const addr = layerZeroChains[chain]?.oftAddress;
            return (
              <Box key={chain} className="audit-card">
                <Box className="audit-card-content">
                  <Typography className="audit-card-subtitle">
                    {chain.toUpperCase()}
                  </Typography>

                  {/* token label | explorer button (button fills full row height) */}
                  <Box className="audit-row audit-row--fill audit-my-4">
                    <Typography className="audit-token">
                      {getLayerZeroWrappedToken(chain)}
                    </Typography>

                    <ButtonCustom
                      variant="redSkyline"
                      onClick={() => openAuditExplorer(chain, addr)}
                      /* keep ButtonCustom as-is; stretch via sx */
                      sx={{
                        alignSelf: "stretch",
                        height: "100%",
                        minWidth: 36,
                        p: "10px",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <img
                        src={explorerPng}
                        alt=""
                        style={{ width: 30, height: 30 }}
                      />
                      {/* accessible name without aria-label */}
                      <span className="sr-only">Open {chain} explorer</span>
                    </ButtonCustom>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* RIGHT — LayerZero transfers (existing UI) */}
      <Box>
        <Typography className="audit-h2">LayerZero transfers</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <Box className="audit-card">
            <Box className="audit-card-content audit-row">
              <Typography></Typography>
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
                  <Typography className="fw-700">
                    {decodeTokenKey(tk)}
                  </Typography>
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
                      <Box className="audit-row audit-my-4">
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
