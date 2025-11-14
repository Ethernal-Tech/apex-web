import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
	capitalizeWord,
	convertDfmToApex,
	toFixed,
} from '../../../utils/generalUtils';
import { ChainEnum } from '../../../swagger/apexBridgeApiService';

interface FeeInformationProps {
	userWalletFee: string;
	bridgeTxFee: string;
	chain: ChainEnum;
}

const FeeInformation: React.FC<FeeInformationProps> = ({
	userWalletFee,
	bridgeTxFee,
	chain,
}) => {
	return (
		<>
			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					gap: '16px', // Add some gap for better spacing
				}}
			>
				<Box
					component="span"
					sx={{
						display: 'flex',
						alignItems: 'center',
						color: 'rgba(255,255,255,0.6)',
					}}
				>
					User Wallet Fee:
					<Tooltip
						title={
							<Typography
								color={'white'}
								sx={{ fontSize: '14px' }}
							>
								This is the fee paid to process your transaction
								on the {capitalizeWord(chain)} blockchain.
								Larger transactions have higher fees.
							</Typography>
						}
						placement="right-start"
					>
						<HelpOutlineIcon
							sx={{ marginLeft: '6px', fontSize: '16px' }}
						/>
					</Tooltip>
				</Box>
				<Box component="span" sx={{ whiteSpace: 'nowrap' }}>
					{BigInt(userWalletFee) > 0
						? toFixed(convertDfmToApex(userWalletFee, chain), 6)
						: '0'}{' '}
					AP3X
				</Box>
			</Typography>

			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					marginTop: '8px', // Add some margin between rows
				}}
			>
				<Box
					component="span"
					sx={{
						display: 'flex',
						alignItems: 'center',
						color: 'rgba(255,255,255,0.6)',
					}}
				>
					Bridge Transaction Fee:
					<Tooltip
						title={
							<Typography
								color={'white'}
								sx={{ fontSize: '14px' }}
							>
								This fee covers the bridge blockchain
								transaction costs. This fee is set to the
								predefined minimum.
							</Typography>
						}
						placement="right-start"
					>
						<HelpOutlineIcon
							sx={{ marginLeft: '6px', fontSize: '16px' }}
						/>
					</Tooltip>
				</Box>
				<Box component="span" sx={{ whiteSpace: 'nowrap' }}>
					{BigInt(bridgeTxFee) > 0
						? toFixed(convertDfmToApex(bridgeTxFee, chain), 6)
						: '0'}{' '}
					AP3X
				</Box>
			</Typography>

			<Typography
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					marginTop: '8px',
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
				<Box component="span">16-20 minutes</Box>
			</Typography>
		</>
	);
};

export default FeeInformation;
