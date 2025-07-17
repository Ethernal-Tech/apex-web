import { Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { useEffect } from "react";
import { fetchAndUpdateSettingsAction } from "../../../actions/settings";
import { fetchAndUpdateLockedTokensAction } from "../../../actions/lockedTokens";

const LockedTokensSection = () => {
  const lockedTokens = useSelector((state: RootState) => state.lockedTokens);
  const dispatch = useDispatch();

  useEffect(() => {
    // Call once immediately on mount
    fetchAndUpdateLockedTokensAction(dispatch);

    // Then call periodically every 5 seconds
    const interval = setInterval(() => {
      fetchAndUpdateLockedTokensAction(dispatch);
    }, 5_000); // 5,000 ms = 5 seconds

    // Cleanup on component unmount
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decodeHex = (hex: string): string => {
    try {
      return decodeURIComponent(hex.replace(/(..)/g, "%$1"));
    } catch (e) {
      return "[InvalidHex]";
    }
  };

  const formatChainsData = () => {
    const data = Object.entries(lockedTokens.chains)
      .map(([key, innerObj]) => {
        const innerText = Object.entries(innerObj)
          .map(([innerKey, num]) => {
            const formattedNum = (num / 1e6).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            if (innerKey === "lovelace") {
              if (key.toLowerCase() === "cardano") {
                return `${formattedNum} ADA`;
              }
              return `${formattedNum} AP3X`;
            } else {
              const parts = innerKey.split(".");
              const decoded = parts[1] ? decodeHex(parts[1]) : innerKey;
              return `${formattedNum} ${decoded}`;
            }
          })
          .join(", ");

        return `${key.toUpperCase()}: ${innerText}`;
      })
      .join(" | ");

    return `${data}`;
  };

  // lovelace => Prime/Vector Apex / 10^6, Cardano => ADA / 10^6 dfm
  // privacyID.hex(name) => name
  return (
    <Box className="banner-container">
      <Typography
        sx={{
          fontSize: "20px",
        }}
        className="banner-text"
      >
        Locked tokens: {formatChainsData()}
      </Typography>
    </Box>
  );
};

export default LockedTokensSection;
