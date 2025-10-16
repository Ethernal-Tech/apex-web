import { Typography, Box } from '@mui/material';
import ApexFusionIcon from '../../../assets/skyline/apex-fusion-icon.svg';
import EthernalIcon from '../../../assets/skyline/ethernal-icon.svg';
import TriangleIcon from '../../../assets/skyline/triangle-icon.svg';
import ShapeIcon from '../../../assets/skyline/shape-icon.svg';
import UnionIcon from '../../../assets/skyline/union-icon.svg';

const InnovatorsSection = () => (
	<Box className="innovators-section">
		<Typography className="innovators-title">
			Trusted by Leading Web3 Innovators
		</Typography>
		<Box className="innovators-logos">
			<img src={ApexFusionIcon} alt="Apex Fusion Icon" />
			<img src={EthernalIcon} alt="Ethernal Icon" />
			<img src={TriangleIcon} alt="Triangle Icon" />
			<img src={ShapeIcon} alt="Shape Icon" />
			<img src={UnionIcon} alt="Union Icon" />
		</Box>
	</Box>
);

export default InnovatorsSection;
