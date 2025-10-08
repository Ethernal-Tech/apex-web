import { Box, Link, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useEffect, useMemo } from "react";
import { fetchAndUpdateLockedTokensAction } from "../../actions/lockedTokens";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import './lockedTokens.css';
import { getCurrencyTokenInfo } from "../../settings/token";
import { toChainEnum } from "../../settings/chain";
import { EXPLORER_URLS } from "../../utils/chainUtils";
import { useLocation } from "react-router-dom";


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

const LockedTokensComponent = () => {
  const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
  const lzChains = useSelector((state: RootState) => state.settings.layerZeroChains);
  const dispatch = useDispatch();
  const location = useLocation();
  const showBaseTokenAddr = location.pathname === '/landing';

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
              const tokenLabel = getCurrencyTokenInfo(toChainEnum(key)).label;
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
    let outputValue: bigint = BigInt(0);
    Object.entries(lockedTokens.totalTransferred).forEach(([_, innerObj]) => {
        outputValue += Object.entries(innerObj).map(([, num]) => BigInt(num > 0 ? num : 0)).reduce((acc, bi) => acc + bi);        
    });

    const label = getCurrencyTokenInfo(ChainEnum.Prime).label;

    return `${formatBigIntDecimalString(outputValue, 6)} ${label}`;
  }, [lockedTokens]);

  return (
    <Box className="banner-container">
      <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          borderBottom: showBaseTokenAddr ? '1px white solid' : undefined,
      }}>
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
      {
        showBaseTokenAddr &&
        <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
            mt: 2
          }}>

            <Typography
              sx={{
                fontSize: 20,
                color: 'white'
              }}
            >
              Base | bAP3X -&nbsp;
              {
                !!lzChains[ChainEnum.Base]?.oftAddress &&
                <Link
                  href={`${EXPLORER_URLS.mainnet[ChainEnum.Base]}/token/${lzChains[ChainEnum.Base].oftAddress}`}
                  target="_blank" rel="noreferrer"
                  sx={{
                    color: 'white'
                  }}
                >
                  {lzChains[ChainEnum.Base].oftAddress}
                </Link>
              }
              
            </Typography>
        </Box>
      }
    </Box>
  );
};

export default LockedTokensComponent;
