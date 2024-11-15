import React from 'react';
import { Box, styled, SxProps, Theme, Typography } from '@mui/material';
import { convertDfmToApex, toFixed } from '../../../utils/generalUtils';
import { ChainEnum } from '../../../swagger/apexBridgeApiService';

const CustomBox = styled(Box)({
	background: '#075159',
});

interface FeeInformationProps {
	sx?: SxProps<Theme>;
	userWalletFee: string;
	bridgeTxFee: string;
	chain: ChainEnum;
}

const FeeInformation: React.FC<FeeInformationProps> = ({
	sx,
	userWalletFee,
	bridgeTxFee,
	chain,
}) => {
	return (
		<CustomBox
			sx={{
				color: 'white',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				...sx,
			}}
		>
			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
				}}
			>
				<Box
					component="span"
					sx={{
						color: 'rgba(255,255,255,0.6)',
					}}
				>
					User Wallet Fee:
				</Box>
				{/* TODO AF - check this conversion is correct */}
				<Box component="span">
					{BigInt(userWalletFee) > 0
						? toFixed(convertDfmToApex(userWalletFee, chain), 6)
						: '0'}{' '}
					APEX
				</Box>
			</Typography>

			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
				}}
			>
				<Box
					component="span"
					sx={{
						color: 'rgba(255,255,255,0.6)',
					}}
				>
					Bridge Transaction Fee:
				</Box>
				{/* TODO AF - check this conversion is correct */}
				<Box component="span">
					{BigInt(bridgeTxFee) > 0
						? toFixed(convertDfmToApex(bridgeTxFee, chain), 6)
						: '0'}{' '}
					APEX
				</Box>
			</Typography>

			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
				}}
			>
				<Box
					component="span"
					sx={{
						color: 'rgba(255,255,255,0.6)',
					}}
				>
					Estimated time
				</Box>
				<Box component="span">4-7 minutes</Box>
			</Typography>
		</CustomBox>
	);
};

export default FeeInformation;
