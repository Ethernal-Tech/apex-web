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

    // Then call periodically every 30 seconds
    const interval = setInterval(() => {
      fetchAndUpdateLockedTokensAction(dispatch);
    }, 30_000); // 30,000 ms = 30 seconds

    // Cleanup on component unmount
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatChainsData = () => {
    let sum = 0;

    const data = Object.entries(lockedTokens.chains)
      .map(([key, innerObj]) => {
        const innerText = Object.entries(innerObj)
          .map(([innerKey, num]) => {
            sum += num;
            const formattedNum = (num / 1e6).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `${formattedNum}`;
          })
          .join(", "); // comma separates entries in the same key group

        return `${key.toUpperCase()}: ${innerText}`;
      })
      .join(" | "); // pipe separates different keys

    const formattedSum = (sum / 1e6).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${data} | Transfered tokens: ${formattedSum}`;
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
