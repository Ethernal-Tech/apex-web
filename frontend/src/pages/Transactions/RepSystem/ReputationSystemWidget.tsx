import { Box, Typography } from '@mui/material';
import ButtonCustom from '../../../components/Buttons/ButtonCustom';
import { IRepSystemMessage } from './reputationData';
import repSystemMacbookImage from '../../../assets/reputation-system-macbook.webp';
import useRepSystemMessage from './useRepSystemMessage';

const REPUTATION_SYSTEM_ROUTE = 'https://reputation.apexfusion.org'; // Reputation System route to open on click

const ReputationSystemWidget = () => {
	const repSystemMessage: IRepSystemMessage | undefined =
		useRepSystemMessage();
	return (
		<Box
			sx={{
				p: 2,
				paddingTop: 4,
				paddingBottom: 0,
				mt: 2,
				background:
					'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
			}}
		>
			<Typography
				variant="h3"
				sx={{
					color: 'white',
					mb: 2,
					fontSize: '20px',
					fontWeight: 'bold',
				}}
			>
				{repSystemMessage?.title}
			</Typography>

			<Typography sx={{ color: 'white', mb: 2 }}>
				{repSystemMessage?.subtitle}
			</Typography>

			<ButtonCustom
				variant="primary"
				onClick={() => window.open(REPUTATION_SYSTEM_ROUTE, '_blank')}
				sx={{
					textTransform: 'uppercase',
					textAlign: 'center',
					width: '100%',
					mb: 2,
				}}
			>
				Start building your reputation
			</ButtonCustom>

			<Box marginTop={2}>
				<img
					src={repSystemMacbookImage}
					alt="apex bridge graph"
					style={{ width: '100%' }}
				/>
			</Box>
		</Box>
	);
};

export default ReputationSystemWidget;
