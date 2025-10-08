import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Box, Tabs, Tab } from "@mui/material";

import BasePage from "../base/BasePage"; // <-- add this import (adjust path if needed)

import { ChainEnum } from "../../swagger/apexBridgeApiService";
import LockedTvbPanel from "../../components/Audit/SkylineAudit";
import LayerZeroPanel from "../../components/Audit/LayerZeroAudit";
import { getLayerZeroWrappedToken, getTokenInfo } from "../../settings/token";
import "../../audit.css";
import { TokenEnum } from "../../features/enums";

function sumToken(addrMap: Record<string, bigint>): bigint {
  let acc = BigInt(0);
  for (const v of Object.values(addrMap)) acc += v;
  return acc;
}
function sumChain(
  tokenMap: Record<string, Record<string, bigint>> | Record<string, bigint>
): Record<string, bigint> {
  const out: Record<string, bigint> = {};
  for (const [token, v] of Object.entries(tokenMap)) {
    out[token] =
      typeof v === "bigint"
        ? (v as bigint)
        : sumToken(v as Record<string, bigint>);
  }
  return out;
}

const AuditPage: React.FC = () => {
  const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
  const enabledChains = useSelector(
    (state: RootState) => state.settings.enabledChains as ChainEnum[]
  );

  const chains = lockedTokens.chains;
  const tvbChains = lockedTokens.totalTransferred;
  const tvbLzChains = lockedTokens.totalTransferredLayerZero;

  const { chainKeys, perChainTotals, tokenTotalsAllChains } = useMemo(() => {
    const chainKeys = Object.keys(chains);
    const perChainTotals: Record<string, Record<string, bigint>> = {};
    const tokenTotalsAllChains: Record<string, bigint> = {};
    for (const [chain, tokenMap] of Object.entries(chains)) {
      const totals = sumChain(tokenMap);
      perChainTotals[chain] = totals;
      for (const [token, amt] of Object.entries(totals)) {
        if (chain !== ChainEnum.Cardano){
        tokenTotalsAllChains[token] =
          (tokenTotalsAllChains[token] ?? BigInt(0)) + amt;
        }
      }
    }
    return { chainKeys, perChainTotals, tokenTotalsAllChains };
  }, [chains]);

  const { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal } =
    useMemo(() => {
      const tvbPerChainTotals: Record<string, Record<string, bigint>> = {};
      const tvbTokenTotalsAllChains: Record<string, bigint> = {};
      for (const [chain, tokenMap] of Object.entries(tvbChains)) {
        const totals = sumChain(tokenMap);
        tvbPerChainTotals[chain] = totals;
        for (const [token, amt] of Object.entries(totals)) {
          tvbTokenTotalsAllChains[token] =
            (tvbTokenTotalsAllChains[token] ?? BigInt(0)) + amt;
        }
      }
      const tvbGrandTotal = Object.values(tvbTokenTotalsAllChains).reduce(
        (a, b) => a + b,
        BigInt(0)
      );
      return { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal };
    }, [tvbChains]);

  const { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal } =
    useMemo(() => {
      const lzPerChainTotals: Record<string, Record<string, bigint>> = {};
      const lzTokenTotalsAllChains: Record<string, bigint> = {};
      for (const [chain, tokenMap] of Object.entries(tvbLzChains)) {
        const totals = sumChain(tokenMap);
        lzPerChainTotals[chain] = totals;
        for (const [token, amt] of Object.entries(totals)) {
          lzTokenTotalsAllChains[
            token === "native"
              ? getLayerZeroWrappedToken(chain as ChainEnum)
              : token
          ] =
            (lzTokenTotalsAllChains[
              token === "native"
                ? getLayerZeroWrappedToken(chain as ChainEnum)
                : token
            ] ?? BigInt(0)) + amt;
        }
      }
      const lzGrandTotal = Object.values(lzTokenTotalsAllChains).reduce(
        (a, b) => a + b,
        BigInt(0)
      );

      return { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal };
    }, [tvbLzChains]);

  const [tab, setTab] = useState<number>(0);

  return (
    <BasePage>
      {" "}
      {/* <-- wrap your page */}
      <Box id="audit" className="skyline-bridge-section">
        <Box className="audit-section">
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            aria-label="Audit tabs"
          >
            <Tab label="Skyline" />
            <Tab label="LayerZero" />
          </Tabs>

          {tab === 0 && (
            <LockedTvbPanel
              chains={chains}
              chainKeys={chainKeys}
              perChainTotals={perChainTotals}
              tokenTotalsAllChains={tokenTotalsAllChains}
              tvbPerChainTotals={tvbPerChainTotals}
              tvbTokenTotalsAllChains={tvbTokenTotalsAllChains}
              tvbGrandTotal={tvbGrandTotal}
              enabledChains={enabledChains}
            />
          )}

          {tab === 1 && (
            <LayerZeroPanel
              lzPerChainTotals={lzPerChainTotals}
              lzTokenTotalsAllChains={lzTokenTotalsAllChains}
              lzGrandTotal={lzGrandTotal}
            />
          )}
        </Box>
      </Box>
    </BasePage>
  );
};

export default AuditPage;
