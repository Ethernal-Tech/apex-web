import { Typography, Box, Button } from '@mui/material';
import SkylineLogo from '../../../assets/skyline/skyline-logo.svg';
import SkylineBridge from '../../../assets/skyline/skyline-bg.svg';
import SkylineBridgeMobile from '../../../assets/skyline/skyline-bg-mobile.svg';
import { ArrowForward } from '@mui/icons-material';

type Props = {
	scrollToSection(): void;
	navigateToBridge(): void;
};

const SkylineSection = ({ scrollToSection, navigateToBridge }: Props) => (
	<Box className="skyline-section-container">
		<Box className="logo-container">
			<Box className="logo-skyline-container">
				<img
					src={SkylineLogo}
					alt="skylineLogo"
					className="skyline-logo"
				/>
				<Typography className="skyline-text">SKYLINE</Typography>
			</Box>
			<Button
				variant="contained"
				className="bridge-button"
				onClick={navigateToBridge}
				endIcon={<ArrowForward />}
			>
				Go To Bridge
			</Button>
		</Box>
		<Box className="content-box">
			<Box className="info-container">
				<Typography className="large-heading">
					Empowering Cross-Chain Connections for the Future of Web3
				</Typography>
				<Typography className="paragraph-text">
					Seamlessly bridge digital assets across blockchains—secure,
					fast, and reliable. Skyline Bridge is your gateway to
					decentralized ecosystems.
				</Typography>
				<Button
					variant="contained"
					className="contact-us-button"
					onClick={scrollToSection}
				>
					Contact Us
				</Button>
			</Box>
			<Box className="bridge-image-container">
				<img
					src={SkylineBridge}
					alt="SkylineBridge"
					className="bridge-image"
				/>
				<Box className="gradient-overlay" />
			</Box>
			<img
				src={SkylineBridgeMobile}
				alt="SkylineBridgeMobile"
				className="bridge-image-mobile"
			/>
		</Box>
	</Box>
);

export default SkylineSection;
