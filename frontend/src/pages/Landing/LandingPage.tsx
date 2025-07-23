import { Box } from "@mui/material";
import SkylineSection from "./components/SkylineSection";
import SkylineBridgeSection from "./components/SkylineBridgeSection";
import UsersSection from "./components/UsersSection";
import InnovatorsSection from "./components/InnovatorsSection";
import ConnectSection from "./components/ConnectSection";
import FooterSection from "./components/FooterSection";
import LockedTokensComponent from "../../components/lockedTokens/LockedTokensComponent"
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE } from "../PageRouter";

const LandingPage = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = () => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateToBridge = () => {
    navigate(HOME_ROUTE);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        "& .MuiTypography-root": {
          color: "#FFFFFF",
        },
      }}
    >
      <LockedTokensComponent />
      <SkylineSection scrollToSection={scrollToSection} navigateToBridge={navigateToBridge} />
      <SkylineBridgeSection />
      <UsersSection />
      <InnovatorsSection />
      <ConnectSection ref={sectionRef} />
      <FooterSection />
    </Box>
  );
};

export default LandingPage;
