import { Typography, Box } from "@mui/material";
import SkylineLogo from "../../../assets/skyline/skyline-logo.svg";
import EmailIcon from "../../../assets/skyline/email-icon.svg";
import LinkedInIcon from "../../../assets/skyline/linkedin-icon.svg";
import XIcon from "../../../assets/skyline/x-icon.svg";

const FooterSection = () => (
  <Box className="footer-section">
    <Typography className="footer-title">SKYLINE</Typography>
    <Box className="footer-subtitle-container">
      <Typography className="footer-subtitle">
        Skyline Bridge | Connecting the Future of Blockchain
      </Typography>
      <Typography className="footer-subtitle-mobile">
        Skyline Bridge
      </Typography>
      <Box className="horizontal-separator" />
      <Typography className="footer-subtitle-mobile">
        Connecting the Future of Blockchain
      </Typography>
    </Box>
    <img
      src={SkylineLogo}
      alt="Skyline Logo"
      className="footer-logo"
    />
    <Box className="footer-icons">
      <a href="mailto:info@ethernal.tech">
        <img src={EmailIcon} alt="Email Icon" />
      </a>
      <a href="https://www.linkedin.com/company/skylinebridge" target="_blank" rel="noreferrer">
        <img src={LinkedInIcon} alt="LinkedIn Icon" />
      </a>
      <a href="https://x.com/skyline_bridge" target="_blank" rel="noreferrer">
        <img src={XIcon} alt="X Icon" />
      </a>
    </Box>
    <Typography className="footer-copyright">
      © Skyline Bridge 2024. All Rights Reserved.
    </Typography>
  </Box>
);

export default FooterSection;
