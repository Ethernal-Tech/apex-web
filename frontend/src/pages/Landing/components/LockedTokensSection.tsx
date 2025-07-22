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
            // ❌ Skip: cardano
            if (key.toLowerCase() === "cardano") {
              return null;
            }

            const formattedNum = (num / 1e6).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            if (innerKey === "lovelace") {
              if (key.toLowerCase() === "prime") {
                return `${formattedNum} AP3X`;
              }
              return `${formattedNum} AP3X`; // fallback for other chains (optional)
            } else {
              const parts = innerKey.split(".");
              const decoded = parts[1] ? decodeHex(parts[1]) : innerKey;
              return `${formattedNum} ${decoded}`;
            }
          })
          .filter(Boolean) // removes `null` from skipped items
          .join(", ");

        if (!innerText) return null; // skip empty chain blocks
        return `${innerText}`;
      })
      .filter(Boolean)
      .join(" | ");

    return `${data}`;
  };
  const formatTransferredData = () => {
    const data = Object.entries(lockedTokens.totalTransferred)
      .map(([key, innerObj]) => {
        const keyLabel = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize

        const filteredEntries = Object.entries(innerObj).filter(
          ([, num]) => num > 0
        );

        if (filteredEntries.length === 0) return null;

        const innerText = filteredEntries
          .map(([innerKey, num]) => {
            const formattedNum = (num / 1e6).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            // 🧠 Same logic as formatChainsData
            if (innerKey === "amount") {
              return formattedNum;
            } else {
              const parts = innerKey.split(".");
              const tokenLabel = parts[1] || innerKey;
              return `${tokenLabel} ${formattedNum}`;
            }
          })
          .join(", ");

        return `${keyLabel}: ${innerText}`;
      })
      .filter(Boolean)
      .join(" | ");

    return data;
  };
  // lovelace => Prime/Vector Apex / 10^6, Cardano => ADA / 10^6 dfm
  // privacyID.hex(name) => name
  return (
    <Box className="banner-container">
      <Typography
        sx={{
          fontSize: "20px",
          whiteSpace: "pre-wrap",
        }}
        className="banner-text"
      >
        TVL | {formatChainsData() + "\t"} Transferred |{" "}
        {formatTransferredData()}
      </Typography>
    </Box>
  );
};

export default LockedTokensSection;
