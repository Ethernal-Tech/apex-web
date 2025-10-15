import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { Box, Tabs, Tab } from "@mui/material";

import BasePage from "../base/BasePage";
import {
  BridgingModeEnum,
  ChainApexBridgeEnum,
  ChainEnum,
} from "../../swagger/apexBridgeApiService";
import LockedTvbPanel from "../../components/Audit/SkylineAudit";
import LayerZeroPanel from "../../components/Audit/LayerZeroAudit";
import { getLayerZeroToken } from "../../settings/token";
import "../../audit.css";
import { isApexChain } from "../../utils/tokenUtils";
import { ISettingsState } from "../../settings/settingsRedux";

const sumToken = (m: Record<string, bigint>) =>
  Object.values(m).reduce((a, b) => a + b, BigInt(0));

const sumChain = (
  tokenMap: Record<string, Record<string, bigint>> | Record<string, bigint>,
  currencyAllowed = true
): Record<string, bigint> => {
  const keep = (k: string) =>
    currencyAllowed ? k === "amount" : k !== "amount";
  return Object.fromEntries(
    Object.entries(tokenMap)
      .filter(([k]) => keep(k))
      .map(([k, v]) => [
        k,
        typeof v === "bigint" ? v : sumToken(v as Record<string, bigint>),
      ])
  );
};

const addAll = (
  into: Record<string, bigint>,
  totals: Record<string, bigint>,
  mapKey?: (k: string) => string
) => {
  for (const [t, v] of Object.entries(totals)) {
    const key = mapKey ? mapKey(t) : t;
    into[key] = (into[key] ?? BigInt(0)) + v;
  }
  return into;
};

const AuditPage: React.FC = () => {
  const { chains, totalTransferred: tvbChains } = useSelector(
    (s: RootState) => s.lockedTokens
  );
  const { settingsPerMode } = useSelector(
    (s: RootState) => s.settings
  );

  const chainKeys = useMemo(() => Object.keys(chains), [chains]);

  const perChainTotals = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(chains).map(([chain, tokenMap]) => [
          chain,
          sumChain(tokenMap, false),
        ])
      ),
    [chains]
  );

  const tokenTotalsAllChains = useMemo(() => {
    const acc: Record<string, bigint> = {};
    for (const [chain, totals] of Object.entries(perChainTotals)) {
      if (chain === ChainEnum.Cardano) continue; // exclude Cardano
      addAll(acc, totals);
    }
    return acc;
  }, [perChainTotals]);

  // Top-level (inside your component, but not inside another hook)
  const skylineChains = useMemo<ChainEnum[]>(() => {
 return Object.values(ChainEnum).filter((x) => 
        x in settingsPerMode[BridgingModeEnum.Skyline].allowedDirections
    );    
  }, [settingsPerMode]);

  const layerZeroChains = useMemo<ChainEnum[]>(() => {
    const set = new Set<string>(Object.values(ChainApexBridgeEnum));
    return Object.values(ChainEnum).filter(
      (x) => !set.has(x as unknown as string)
    ) as ChainEnum[];
  }, []);

  // Now use those values inside your other memos
  const { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal } =
    useMemo(() => {
      const skylineSet = new Set(skylineChains);
      const tvbPerChainTotals = Object.fromEntries(
        Object.entries(tvbChains)
          .filter(([chain]) => skylineSet.has(chain as ChainEnum))
          .map(([chain, tokenMap]) => [
            chain,
            sumChain(tokenMap, isApexChain(chain)),
          ])
      );

      const tvbTokenTotalsAllChains = Object.entries(tvbPerChainTotals).reduce(
        (acc, [, totals]) => addAll(acc, totals),
        {} as Record<string, bigint>
      );

      const tvbGrandTotal = Object.values(tvbTokenTotalsAllChains).reduce(
        (a, b) => a + b,
        BigInt(0)
      );

      return { tvbPerChainTotals, tvbTokenTotalsAllChains, tvbGrandTotal };
    }, [tvbChains, skylineChains]);

  const { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal } =
    useMemo(() => {
      const lzSet = new Set(layerZeroChains);
      const lzPerChainTotals = Object.fromEntries(
        Object.entries(tvbChains)
          .filter(([chain]) => lzSet.has(chain as ChainEnum))
          .map(([chain, tokenMap]) => [
            chain,
            sumChain(tokenMap, isApexChain(chain)),
          ])
      );

      const lzTokenTotalsAllChains = Object.entries(lzPerChainTotals).reduce(
        (acc, [, totals]) => addAll(acc, totals),
        {} as Record<string, bigint>
      );

      const lzGrandTotal = Object.values(lzTokenTotalsAllChains).reduce(
        (a, b) => a + b,
        BigInt(0)
      );

      return { lzPerChainTotals, lzTokenTotalsAllChains, lzGrandTotal };
    }, [tvbChains, layerZeroChains]);

  const [tab, setTab] = useState(0);

  return (
    <BasePage>
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
