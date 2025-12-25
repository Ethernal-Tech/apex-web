import React from 'react';
import { Box, styled, SxProps, Theme, Typography } from '@mui/material';
import { ChainEnum } from '../../../swagger/apexBridgeApiService';
import FeeInformation from './FeeInformation';

const CustomBox = styled(Box)({
	color: 'white',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'space-between',
	marginTop: '30px',
});

interface InfoBoxProps {
	sx?: SxProps<Theme>;
	userWalletFee: string;
	bridgeTxFee: string;
	chain: ChainEnum;
	isFeeInformation: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = ({
	sx,
	userWalletFee,
	bridgeTxFee,
	chain,
	isFeeInformation = true,
}) => {
	return (
		<CustomBox
			sx={{
				...sx,
			}}
		>
			{isFeeInformation ? (
				<FeeInformation
					userWalletFee={userWalletFee}
					bridgeTxFee={bridgeTxFee}
					chain={chain}
				/>
			) : (
				<Typography
					sx={{
						color: 'white',
						textAlign: 'center',
						fontSize: '18px',
					}}
				>
					Bridge validator set change in progress.
					<br />
					Bridging is not possible at the moment.
				</Typography>
			)}
		</CustomBox>
	);
};

export default InfoBox;
