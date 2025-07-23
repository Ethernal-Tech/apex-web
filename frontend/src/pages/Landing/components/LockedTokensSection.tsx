import { Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { useEffect, useMemo } from "react";
import { fetchAndUpdateLockedTokensAction } from "../../../actions/lockedTokens";
import { ChainEnum } from "../../../swagger/apexBridgeApiService";
import {
  TokenEnumToLabel,
  fromChainToChainCurrency,
  fromChainToChainNativeToken,
} from "../../../utils/chainUtils";
import { capitalizeWord } from "../../../utils/generalUtils";


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

const formatBigIntDecimalString = (value: bigint, decimals: number = 6) => {
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

const LockedTokensSection = () => {
  const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
  const dispatch = useDispatch();

  useEffect(() => {
    // Call once immediately on mount
    fetchAndUpdateLockedTokensAction(dispatch);

    // Then call periodically every 30 seconds
    const interval = setInterval(() => {
      fetchAndUpdateLockedTokensAction(dispatch);
    }, 30_000); // 30,000 ms = 30 seconds

    // Cleanup on component unmount
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chainsData = useMemo(() => {
    return Object.entries(lockedTokens.chains)
      .map(([key, innerObj]) => {
        const innerText = Object.entries(innerObj)
          .map(([innerKey, num]) => {
            // ❌ Skip: cardano
            if (key.toLowerCase() === ChainEnum.Cardano) return null;

            const formattedNum = formatBigIntDecimalString(num, 6);

            if (innerKey === "lovelace") {
              const tokenLabel =
                TokenEnumToLabel[fromChainToChainCurrency(ChainEnum.Prime)];
              return `${formattedNum} ${tokenLabel}`;
            } else {
              const parts = innerKey.split(".");
              const decoded = parts[1] ? decodeHex(parts[1]) : innerKey;
              return `${formattedNum} ${decoded}`;
            }
          })
          .filter(Boolean)
          .join(", ");

        return innerText || null;
      })
      .filter(Boolean)
      .join(" | ")
      .trim();
  }, [lockedTokens]);

  const transferredData = useMemo(() => {
    return Object.entries(lockedTokens.totalTransferred)
      .map(([key, innerObj]) => {
        const keyLabel = capitalizeWord(key);

        const filteredEntries = Object.entries(innerObj).filter(
          ([, num]) => num > 0
        );
        if (filteredEntries.length === 0) return null;

        const innerText = filteredEntries
          .map(([innerKey, num]) => {
            const formattedNum = formatBigIntDecimalString(num, 6);
            if (innerKey === "amount") {
              return formattedNum;
            } else {
              return `${TokenEnumToLabel[fromChainToChainNativeToken(key.toLowerCase() as ChainEnum)]} ${formattedNum}`;
            }
          })
          .join(", ");

        return `${keyLabel}: ${innerText}`;
      })
      .filter(Boolean)
      .join(" | ")
      .trim();
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
          Transferred | {transferredData}
        </Typography>
      }
    </Box>
  );
};

export default LockedTokensSection;
