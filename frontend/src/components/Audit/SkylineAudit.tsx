import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import CustomSelect from "../../components/customSelect/CustomSelect";
import { isEvmChain, ChainInfo, getSrcChains, getChainInfo } from "../../settings/chain";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { formatBigIntDecimalString } from "../lockedTokens/LockedTokensComponent";

/* ---------- Types ---------- */
type ChainsBig = Record<string, Record<string, Record<string, bigint>>>;

type LockedTvbPanelProps = {
  chains: ChainsBig;
  chainKeys: string[];
  perChainTotals: Record<string, Record<string, bigint>>;
  tokenTotalsAllChains: Record<string, bigint>;

  tvbPerChainTotals: Record<string, Record<string, bigint>>;
  tvbTokenTotalsAllChains: Record<string, bigint>;
  tvbGrandTotal: bigint;

  enabledChains: ChainEnum[];
};

const decodeHex = (hex: string): string => {
  try {
    return decodeURIComponent(hex.replace(/(..)/g, "%$1"));
  } catch (e) {
    return "[InvalidHex]";
  }
};

/* ---------- Local helpers ---------- */
function decodeTokenKey(tokenKey: string): string {
  if (tokenKey === "lovelace" || tokenKey === "amount") return "AP3X";
  const parts = tokenKey.split(".");
  if (parts.length < 2) return tokenKey;
  const hex = parts[1];
  let decoded = "";
  try {
    decoded = decodeHex(hex) as string;
  } catch {
    /* ignore */
  }
  if (!decoded || /invalid\s*hex/i.test(decoded)) return hex;
  return decoded;
}

function sumToken(addrMap: Record<string, bigint>): bigint {
  let acc = BigInt(0);
  for (const v of Object.values(addrMap)) acc += v;
  return acc;
}

const LockedTvbPanel: React.FC<LockedTvbPanelProps> = ({
  chains,
  chainKeys,
  perChainTotals,
  tokenTotalsAllChains,
  tvbPerChainTotals,
  tvbTokenTotalsAllChains,
  tvbGrandTotal,
  enabledChains,
}) => {
  // Select options
  const srcChainOptions = useMemo(() => {
    const enabled = new Set<ChainEnum>(enabledChains ?? []);
    return getSrcChains()
      .filter((c) => enabled.has(c))
      .filter((c) => !isEvmChain(c)) // ← skip EVM chains
      .map((c) => getChainInfo(c));
  }, [enabledChains]);

  // Selection state for per-address table
  const [selChain, setSelChain] = useState<string>(() => chainKeys[0] ?? "");
  const tokensOfSelChain = useMemo(
    () => Object.keys(chains[selChain] ?? {}),
    [chains, selChain]
  );
  const [selToken, setSelToken] = useState<string>(
    () => tokensOfSelChain[0] ?? "lovelace"
  );

  useEffect(() => {
    if (!chains[selChain]) setSelChain(chainKeys[0] ?? "");
  }, [chains, chainKeys, selChain]);

  useEffect(() => {
    const tokens = Object.keys(chains[selChain] ?? {});
    if (tokens.length && !tokens.includes(selToken)) setSelToken(tokens[0]);
  }, [chains, selChain, selToken]);

  const addrMap = chains[selChain]?.[selToken] ?? {};

  return (
    <Box className="audit-layout">
      {/* LEFT — LOCKED */}
      <Box>
        <Typography className="audit-h2">Total locked (TVL)</Typography>
        <Box className="audit-grid-3 audit-mb-20">
          {Object.entries(tokenTotalsAllChains)
            .sort((a, b) => Number(b[1] - a[1]))
            .map(([tokenKey, amt]) => {
              const label = decodeTokenKey(tokenKey);
              return (
                <Box key={label} className="audit-card">
                  <Box className="audit-card-content audit-row">
                    <Typography>{decodeTokenKey(label)}</Typography>
                    <Typography className="audit-amount">
                      {formatBigIntDecimalString(amt, 6)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
        </Box>

        <Typography className="audit-h2">Total locked per Chain</Typography>
        <Box className="audit-grid-3 audit-mb-20">
          {chainKeys.map((ck) => {
            const rows = Object.entries(perChainTotals[ck] ?? {})
              .sort((a, b) => Number(b[1] - a[1]))
              .map(([token, amt]) => ({ token: decodeTokenKey(token), amt }));
            return (
              <Box key={ck} className="audit-card audit-card--accent">
                <Box className="audit-card-content">
                  <Typography className="audit-card-subtitle audit-mb-10">
                    {ck.toUpperCase()}
                  </Typography>
                  {rows.length === 0 && (
                    <Typography className="audit-dim">No data</Typography>
                  )}
                  {rows.map((r) => (
                    <Box key={r.token} className="audit-row font-14 audit-my-6">
                      <Typography component="span">{r.token}</Typography>
                      <Typography component="span" className="audit-amount">
                        {formatBigIntDecimalString(r.amt, 6)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Typography className="audit-h2">Per-address Breakdown</Typography>
        <Box className="audit-card audit-card--accent">
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
                  {formatBigIntDecimalString(sumToken(addrMap), 6)}{" "}
                  <Typography component="span" className="audit-dim" style={{ fontSize: 14 }}>
                    {decodeTokenKey(selToken)}
                  </Typography>
                </Typography>
              </Box>
            </Box>

            <Box className="audit-scroll-x">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th style={{ textAlign: "center" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(addrMap)
                    .sort((a, b) => Number(b[1] - a[1]))
                    .map(([addr, amt]) => (
                      <tr key={addr}>
                        <td
                          style={{
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {addr}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "16px", fontWeight: "700" }}>
                          {formatBigIntDecimalString(amt, 6)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* CENTER — TVB */}
      <Box>
        <Typography className="audit-h2">Total Bridged (TVB)</Typography>

        <Box className="audit-mb-8 audit-w-half-md">
          <Box className="audit-card">
            <Box className="audit-card-content audit-row">
              <Typography>AP3X</Typography>
              <Typography className="audit-amount">
                {formatBigIntDecimalString(tvbGrandTotal, 6)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography className="audit-h2">Total Bridged By Coin</Typography>
        <Box className="audit-grid-md-2 audit-gap-12 audit-mb-16">
          {Object.entries(tvbTokenTotalsAllChains)
            .sort((a, b) => Number(b[1] - a[1]))
            .map(([tk, amt]) => (
              <Box key={tk} className="audit-card">
                <Box className="audit-card-content audit-row">
                  <Typography>{decodeTokenKey(tk)}</Typography>
                  <Typography className="audit-amount">
                    {formatBigIntDecimalString(amt, 6)}
                  </Typography>
                </Box>
              </Box>
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
              const rows = Object.entries(tvbPerChainTotals[ck] ?? {})
                .sort((a, b) => Number(b[1] - a[1]))
                .map(([token, amt]) => ({ token: decodeTokenKey(token), amt }));
              return (
                <Box key={ck} className="audit-card">
                  <Box className="audit-card-content">
                    <Typography className="audit-card-subtitle">{ck}</Typography>
                    {rows.length === 0 && (
                      <Typography className="audit-dim">No data</Typography>
                    )}
                    {rows.map((r) => (
                      <Box key={r.token} className="audit-row audit-my-4">
                        <Typography>{r.token}</Typography>
                        <Typography className="audit-amount">
                          {formatBigIntDecimalString(r.amt, 6)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
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
