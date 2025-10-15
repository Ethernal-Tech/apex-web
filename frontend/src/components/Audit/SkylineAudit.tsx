import React, { useMemo, useState, useEffect } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import CustomSelect from "../../components/customSelect/CustomSelect";
import { isEvmChain, getSrcChains, getChainInfo } from "../../settings/chain";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { formatBigIntDecimalString } from "../lockedTokens/LockedTokensComponent";
import { openAddressExplorer } from "../../utils/chainUtils";
import explorerPng from "@../../../public/explorer.png";
import { decodeTokenKey } from "../../utils/tokenUtils";
import { getTokenInfo } from "../../settings/token";
import { TokenEnum } from "../../features/enums";
import { RootState } from "../../redux/store";
import { useSelector } from "react-redux";
import { compareBigInts } from "../../features/utils";

type SkylinePanelProps = {
  chains: Record<string, Record<string, Record<string, bigint>>>;
  chainKeys: string[];
  perChainTotals: Record<string, Record<string, bigint>>;
  tokenTotalsAllChains: Record<string, bigint>;
  tvbPerChainTotals: Record<string, Record<string, bigint>>;
  tvbTokenTotalsAllChains: Record<string, bigint>;
  tvbGrandTotal: bigint;
};

const sumToken = (m: Record<string, bigint>) =>
  Object.values(m).reduce((a, v) => a + v, BigInt(0));
const fmt = (v: bigint) => formatBigIntDecimalString(v, 6);
const sortEntries = (r: Record<string, bigint>) =>
  Object.entries(r).sort((a, b) => compareBigInts(b[1], a[1]));

const AmountCard: React.FC<{ left: string; right: string }> = ({
  left,
  right,
}) => (
  <Box className="audit-card">
    <Box className="audit-card-content audit-row">
      <Typography>{left}</Typography>
      <Typography className="audit-amount">{right}</Typography>
    </Box>
  </Box>
);

const ChainTotalsCard: React.FC<{
  chain: string;
  rows: Array<{ label: string; amt: bigint }>;
}> = ({ chain, rows }) => (
  <Box className="audit-card">
    <Box className="audit-card-content">
      <Typography className="audit-card-subtitle audit-mb-10">
        {chain.toUpperCase()}
      </Typography>
      {rows.length === 0 ? (
        <Typography className="audit-dim">No data</Typography>
      ) : (
        rows.map(({ label, amt }) => (
          <Box key={label} className="audit-row font-14 audit-my-6">
            <Typography component="span">{label}</Typography>
            <Typography component="span" className="audit-amount">
              {fmt(amt)}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  </Box>
);

const LockedTvbPanel: React.FC<SkylinePanelProps> = ({
  chains,
  chainKeys,
  perChainTotals,
  tokenTotalsAllChains,
  tvbPerChainTotals,
  tvbTokenTotalsAllChains,
  tvbGrandTotal,
}) => {
  const settings = useSelector((s: RootState) => s.settings);

  const srcChainOptions = useMemo(() => {
    return getSrcChains(settings).map(getChainInfo);
  }, [settings]);

  // selection
  const [selChain, setSelChain] = useState<string>(ChainEnum.Prime);
  useEffect(() => {
    if (!chains[selChain]) setSelChain(chainKeys[0] ?? "");
  }, [chains, chainKeys, selChain]);

  const tokensOfSelChain = useMemo(
    () => Object.keys(chains[selChain] ?? {}),
    [chains, selChain]
  );
  const [selToken, setSelToken] = useState<string>("lovelace");
  useEffect(() => {
    if (tokensOfSelChain.length && !tokensOfSelChain.includes(selToken)) {
      setSelToken(tokensOfSelChain[0]);
    }
  }, [tokensOfSelChain, selToken]);

  const addrMap = chains[selChain]?.[selToken] ?? {};

  return (
    <Box className="audit-layout">
      <Box>
        <Typography className="audit-h2">Total locked (TVL)</Typography>
        <Box className="audit-grid-3 audit-mb-20">
          {sortEntries(tokenTotalsAllChains).map(([tokenKey, amt]) => (
            <AmountCard
              key={tokenKey}
              left={decodeTokenKey(tokenKey)}
              right={fmt(amt)}
            />
          ))}
        </Box>

        <Typography className="audit-h2">Total locked per Chain</Typography>
        <Box className="audit-grid-3">
          {chainKeys.map((ck) => {
            const rows = sortEntries(perChainTotals[ck] ?? {}).map(
              ([t, a]) => ({
                label: decodeTokenKey(t, ck),
                amt: a,
              })
            );
            return <ChainTotalsCard key={ck} chain={ck} rows={rows} />;
          })}
        </Box>

        <Typography className="audit-h2">Per-address Breakdown</Typography>
        <Box className="audit-card">
          <Box className="audit-card-content">
            <Box className="audit-toolbar">
              <Box className="audit-toolbar-left">
                <Box className="audit-select-wrap">
                  <CustomSelect
                    id="audit-chain"
                    label="Chain"
                    value={selChain}
                    onChange={(e) => setSelChain(e.target.value as string)}
                    options={srcChainOptions}
                    width="100%"
                  />
                </Box>
              </Box>
            </Box>

            <Box className="audit-grid-3 audit-gap-18">
              <Box>
                <Typography className="audit-muted">
                  Token Total (sum of all addresses):
                </Typography>
                <Typography className="audit-muted">
                  {fmt(sumToken(addrMap))}{" "}
                  <Typography
                    component="span"
                    className="audit-dim"
                    style={{ fontSize: 14 }}
                  >
                    {decodeTokenKey(selToken)}
                  </Typography>
                </Typography>
              </Box>
            </Box>

            <Box className="audit-scroll-x">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Explorer</th>
                    <th>Address</th>
                    <th style={{ textAlign: "center" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortEntries(addrMap).map(([addr, amt]) => (
                    <tr key={addr}>
                      <td>
                        <Tooltip title="Open in explorer">
                          <IconButton
                            aria-label="Open in explorer"
                            onClick={() =>
                              openAddressExplorer(selChain as ChainEnum, addr, true)
                            }
                            size="small"
                          >
                            <Box
                              component="img"
                              src={explorerPng}
                              alt=""
                              sx={{ width: 34, height: 34 }}
                              className="audit-cta-icon"
                            />
                          </IconButton>
                        </Tooltip>
                      </td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                        }}
                      >
                        {addr}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {fmt(amt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography className="audit-h2">Total Bridged (TVB)</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <AmountCard
            left={getTokenInfo(TokenEnum.APEX).label}
            right={fmt(tvbGrandTotal)}
          />
        </Box>

        <Typography className="audit-h2">Total Bridged By Coin</Typography>
        <Box className="audit-grid-md-2 audit-gap-12 audit-mb-16">
          {sortEntries(tvbTokenTotalsAllChains).map(([tk, amt]) => (
            <AmountCard key={tk} left={decodeTokenKey(tk)} right={fmt(amt)} />
          ))}
          {Object.keys(tvbTokenTotalsAllChains).length === 0 && (
            <Typography className="audit-dim">No transfers yet.</Typography>
          )}
        </Box>

        <Typography className="audit-h2">Total Bridged By Chain</Typography>
        <Box className="audit-grid-md-2 audit-gap-12">
          {Object.keys(tvbPerChainTotals)
            .filter((ck) => !isEvmChain(ck as ChainEnum))
            .map((ck) => {
              const rows = sortEntries(tvbPerChainTotals[ck] ?? {}).map(
                ([t, a]) => ({
                  label: decodeTokenKey(t),
                  amt: a,
                })
              );
              return <ChainTotalsCard key={ck} chain={ck} rows={rows} />;
            })}
          {Object.keys(tvbPerChainTotals).length === 0 && (
            <Typography className="audit-dim">No transfers yet.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LockedTvbPanel;
