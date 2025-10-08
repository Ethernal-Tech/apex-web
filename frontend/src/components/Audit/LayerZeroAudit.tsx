import React from "react";
import { Box, Typography } from "@mui/material";
import { isEvmChain } from "../../settings/chain";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { getLayerZeroWrappedToken, getTokenInfo } from "../../settings/token";
import { formatBigIntDecimalString } from "../lockedTokens/LockedTokensComponent";
import "../../audit.css";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { openAuditExplorer } from "../../utils/chainUtils";
import ButtonCustom from "../Buttons/ButtonCustom";
import explorerPng from "@../../../public/explorer.png";
import { decodeTokenKey } from "../../utils/tokenUtils";
import { TokenEnum } from "../../features/enums";

type LayerZeroPanelProps = {
  lzPerChainTotals: Record<string, Record<string, bigint>>;
  lzTokenTotalsAllChains: Record<string, bigint>;
  lzGrandTotal: bigint;
};

const LayerZeroPanel: React.FC<LayerZeroPanelProps> = ({
  lzPerChainTotals,
  lzTokenTotalsAllChains,
  lzGrandTotal,
}) => {
  const {layerZeroLockedTokens} = useSelector(
    (state: RootState) => state.lockedTokens
  );

  const { layerZeroChains } = useSelector((state: RootState) => state.settings);
  const address = layerZeroChains[ChainEnum.Nexus].oftAddress;

  return (
    <Box className="skyline-bridge-section">
      <Box className="audit-wrap">
        {/* ===== Row 1: TVL (left) | LZ transfers (center) | spacer (right) ===== */}
        <Box className="audit-hero-row audit-mb-16">
          {/* Left: TVL */}
          <Box>
            <Typography className="audit-h2">Locked Tokens</Typography>
            <Box className="audit-card">
              <Box className="audit-card-content audit-row">
                <Box className="audit-left">
                  <Typography>{getTokenInfo(TokenEnum.APEX).label}</Typography>
                  <ButtonCustom
                    variant="redSkyline"
                    onClick={() => openAuditExplorer(ChainEnum.Nexus, address)}
                  >
                    <img className="audit-cta-icon" src={explorerPng} alt="" />
                  </ButtonCustom>
                </Box>
                <Typography className="audit-amount">
                  {formatBigIntDecimalString(layerZeroLockedTokens, 18)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Center: LayerZero transfers */}
          <Box>
            <Typography className="audit-h2">LayerZero transfers</Typography>
            <Box className="audit-card audit-card--center">
              <Box className="audit-card-content audit-row">
                <Typography>{getTokenInfo(TokenEnum.APEX).label}</Typography>
                <Typography className="audit-amount">
                  {formatBigIntDecimalString(lzGrandTotal, 6)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right spacer for visual balance */}
          <Box />
        </Box>

        {/* ===== Row 2: Transferred by coin (3 boxes/row) ===== */}
        <Box className="audit-mb-16">
          <Typography className="audit-h2">Transferred by coin</Typography>
          <Box className="audit-grid-3">
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
          </Box>
          {Object.keys(lzTokenTotalsAllChains).length === 0 && (
            <Typography className="audit-dim audit-mb-8">No transfers yet.</Typography>
          )}
        </Box>

        {/* ===== Row 3: Transferred by chain (3 boxes/row) ===== */}
        <Box>
          <Typography className="audit-h2">Transferred by chain</Typography>
          <Box className="audit-grid-3">
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
                      {rows.map((r, idx) => (
                        <Box key={idx} className="audit-row audit-my-4">
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
          </Box>
          {Object.keys(lzPerChainTotals).length === 0 && (
            <Typography className="audit-dim audit-mb-8">No transfers yet.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LayerZeroPanel;
