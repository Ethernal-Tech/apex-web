import { Box } from "@mui/material";
import SkylineSection from "./components/SkylineSection";
import SkylineBridgeSection from "./components/SkylineBridgeSection";
import UsersSection from "./components/UsersSection";
import InnovatorsSection from "./components/InnovatorsSection";
import ConnectSection from "./components/ConnectSection";
import FooterSection from "./components/FooterSection";
import { useRef } from "react";

const LandingPage = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = () => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        "& .MuiTypography-root": {
          fontFamily: "Lato, serif",
          color: "#FFFFFF",
        },
      }}
    >
      <SkylineSection onClick={scrollToSection} />
      <SkylineBridgeSection />
      <UsersSection />
      <InnovatorsSection />
      <ConnectSection ref={sectionRef} />
      <FooterSection />
    </Box>
  );
};

export default LandingPage;
