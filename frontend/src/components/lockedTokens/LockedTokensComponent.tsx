import { Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useEffect, useMemo } from "react";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import './lockedTokens.css';
import { getCurrencyTokenInfo } from "../../settings/token";
import { toChainEnum } from "../../settings/chain";
import { fetchAndUpdateLockedTokensAction } from "../../actions/lockedTokens";

const DIV = BigInt(1_000_000_000_000);

const to6Round = (value18: bigint): bigint => (value18 + DIV / BigInt(2)) / DIV;

const decodeHex = (hex: string): string => {
  try {
    return decodeURIComponent(hex.replace(/(..)/g, "%$1"));
  } catch (e) {
    return "[InvalidHex]";
  }
};

const powBigInt = (base: bigint, exp: number): bigint => {
  let result = BigInt(1);
  for (let i = 0; i < exp; i++) {
    result = result * base;
  }
  return result;
};

export const formatBigIntDecimalString = (value: bigint, decimals: number = 6) => {
  const divisor = powBigInt(BigInt(10), decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  // Format whole part (e.g., "1.000.000")
  const formattedWhole = whole
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Pad fractional part to correct length (e.g., "01")
  const paddedFraction = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, 2); // show only 2 decimals

  return `${formattedWhole}.${paddedFraction}`;
};

const LockedTokensComponent = () => {
  const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
  const {layerZeroChains} = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  console.log("layerZERO CHAIN COMPONENT", layerZeroChains)

  useEffect(() => {
    // Call once immediately on mount
    fetchAndUpdateLockedTokensAction(dispatch, layerZeroChains);

    // Then call periodically every 30 seconds
    const interval = setInterval(() => {
      fetchAndUpdateLockedTokensAction(dispatch, layerZeroChains);
    }, 30_000); // 30,000 ms = 30 seconds

    // Cleanup on component unmount
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerZeroChains]);

  const lockedTokensLZFormatted = useMemo(() => {
    return to6Round(lockedTokens.layerZeroLockedTokens);
  }, [lockedTokens.layerZeroLockedTokens] )


  const chainsData = useMemo(() => {
    const chunks: string[] = [];

    for (const [chainKey, tokenMap] of Object.entries(lockedTokens.chains)) {
      const chainEnum = toChainEnum(chainKey);

      // ❌ Skip Cardano chains entirely
      if (chainEnum === ChainEnum.Cardano) continue;

      const tokenTexts: string[] = [];

      for (const [tokenKey, addrMap] of Object.entries(tokenMap)) {
        // Sum all addresses for this token
        let total = Object.values(addrMap).reduce<bigint>(
          (acc, v) => acc + (typeof v === "bigint" ? v : BigInt(v ?? 0)),
          BigInt(0)
        );

        // Optional: skip zero amounts
        if (total === BigInt(0)) continue;

        total += lockedTokensLZFormatted;

        const formatted = formatBigIntDecimalString(total, 6);

        if (tokenKey === "lovelace") {
          const tokenLabel = getCurrencyTokenInfo(chainEnum).label;
          tokenTexts.push(`${formatted} ${tokenLabel}`);
        } else {
          // Keep your token-name decoding logic
          const parts = tokenKey.split(".");
          let decoded = tokenKey;
          if (parts[1]) {
            try {
              decoded = decodeHex(parts[1]);
            } catch {
              decoded = parts[1]; // fallback
            }
          }
          tokenTexts.push(`${formatted} ${decoded}`);
        }
      }

      if (tokenTexts.length) {
        chunks.push(tokenTexts.join(", "));
      }
    }

    return chunks.join(" | ").trim();
  }, [lockedTokens.chains, lockedTokensLZFormatted]);

  const transferredData = useMemo(() => {
    let outputValue = BigInt(0);

    Object.entries(lockedTokens.totalTransferred).forEach(([chainKey, innerObj]) => {
      const chain = chainKey.toLowerCase();
      const o = innerObj as unknown as Record<string, string | number | bigint>;

      if (chain === ChainEnum.Prime || chain === ChainEnum.Nexus || chain === ChainEnum.Vector) {
        outputValue += BigInt(o.amount || '0');
      } else {
        outputValue += BigInt(
          Object.entries(o).find((x) => x[0] !== 'amount')?.[1] || '0'
        )
      }
    });

    if (outputValue > BigInt(0)) {
      const label = getCurrencyTokenInfo(ChainEnum.Prime).label;
      return `${formatBigIntDecimalString(outputValue, 6)} ${label}`;
    }

    return "";
  }, [lockedTokens]);

  return (
    <Box className="banner-container">
      {
        chainsData.length > 0 &&
        <Typography
          className="banner-text"
        >
          TVL | {chainsData}
        </Typography>
      }
      {
        transferredData.length > 0 &&
        <Typography
          className="banner-text"
        >
          TVB | {transferredData}
        </Typography>
      }
    </Box>
  );
};

export default LockedTokensComponent;
