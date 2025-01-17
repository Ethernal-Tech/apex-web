import { Box } from "@mui/material";
import SkylineSection from "./components/SkylineSection";
import SkylineBridgeSection from "./components/SkylineBridgeSection";
import UsersSection from "./components/UsersSection";
import InnovatorsSection from "./components/InnovatorsSection";
import ConnectSection from "./components/ConnectSection";
import FooterSection from "./components/FooterSection";

const LandingPage = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      "& .MuiTypography-root": { fontFamily: "Lato, serif", color: "#FFFFFF" },
    }}
  >
    <SkylineSection />
    <SkylineBridgeSection />
    <UsersSection />
    <InnovatorsSection />
    <ConnectSection />
    <FooterSection />
  </Box>
);

export default LandingPage;
