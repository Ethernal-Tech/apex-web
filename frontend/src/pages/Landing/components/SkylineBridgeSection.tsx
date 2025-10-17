import { Typography, Box } from '@mui/material';
import InteroperabilityIcon from '../../../assets/skyline/interoperability-icon.svg';
import SecurityIcon from '../../../assets/skyline/security-icon.svg';
import ScalableIcon from '../../../assets/skyline/scalable-icon.svg';

const SkylineBridgeSection = () => (
	<Box className="skyline-bridge-section-land">
		<Box className="skyline-bridge-header">
			<Typography className="skyline-bridge-title">
				What is Skyline Bridge?
			</Typography>
			<Typography className="skyline-bridge-description">
				A cross-chain bridging protocol designed to transfer tokens and
				assets securely and efficiently between blockchain ecosystems.
			</Typography>
		</Box>
		<Box className="skyline-bridge-content">
			<Box className="skyline-bridge-item">
				<Box className="skyline-bridge-icon">
					<img
						src={InteroperabilityIcon}
						alt="InteroperabilityIcon"
					/>
				</Box>
				<Box className="skyline-bridge-text">
					<Typography className="skyline-bridge-item-title">
						Seamless Interoperability
					</Typography>
					<Typography className="skyline-bridge-item-description">
						Connect assets, applications, and communities across
						multiple blockchains. Skyline unlocks new possibilities
						for cross-chain innovation.
					</Typography>
				</Box>
			</Box>
			<Box className="skyline-bridge-item">
				<Box className="skyline-bridge-icon">
					<img src={SecurityIcon} alt="SecurityIcon" />
				</Box>
				<Box className="skyline-bridge-text">
					<Typography className="skyline-bridge-item-title">
						Decentralized Security
					</Typography>
					<Typography className="skyline-bridge-item-description">
						Powered by a multi-signature validation system, Skyline
						ensures trust and protection with every transaction.
					</Typography>
				</Box>
			</Box>
			<Box className="skyline-bridge-item">
				<Box className="skyline-bridge-icon">
					<img src={ScalableIcon} alt="ScalableIcon" />
				</Box>
				<Box className="skyline-bridge-text">
					<Typography className="skyline-bridge-item-title">
						Scalable and Efficient
					</Typography>
					<Typography className="skyline-bridge-item-description">
						Skyline batches transactions for optimized speed and
						cost-effectiveness, enabling smooth asset transfers for
						any ecosystem.
					</Typography>
				</Box>
			</Box>
		</Box>
	</Box>
);

export default SkylineBridgeSection;
