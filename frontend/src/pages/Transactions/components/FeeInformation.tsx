import React from 'react';
import {
	Box,
	styled,
	SxProps,
	Theme,
	Tooltip,
	Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
	capitalizeWord,
	convertDfmToApex,
	toFixed,
} from '../../../utils/generalUtils';
import { ChainEnum } from '../../../swagger/apexBridgeApiService';
import { getCurrencyTokenInfo } from '../../../settings/token';
import { BridgingModeEnum } from '../../../settings/chain';

const CustomBox = styled(Box)({
	background: '#075159',
});

interface FeeInformationProps {
	sx?: SxProps<Theme>;
	userWalletFee?: string;
	bridgeTxFee?: string;
	operationFee?: string;
	chain: ChainEnum;
	bridgingMode: BridgingModeEnum;
	isFeeInformation: boolean;
}

const FeeInformation: React.FC<FeeInformationProps> = ({
	sx,
	userWalletFee,
	bridgeTxFee,
	operationFee,
	chain,
	bridgingMode,
	isFeeInformation,
}) => {
	const currencyToken = getCurrencyTokenInfo(chain);
	const isSkylineMode = bridgingMode === BridgingModeEnum.Skyline;
	const isLayerZeroMode = bridgingMode === BridgingModeEnum.LayerZero;
	const isReactorMode = bridgingMode === BridgingModeEnum.Reactor;

	if (isReactorMode && !isFeeInformation) {
		return (
			<CustomBox
				sx={{
					color: 'white',
					textAlign: 'center',
					...sx,
				}}
			>
				<Typography sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
					Bridge validator set change in progress.
					<br />
					Bridging is not possible at the moment.
				</Typography>
			</CustomBox>
		);
	}

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
			{userWalletFee && (
				<Typography
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
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
						{isLayerZeroMode
							? 'Estimated Network Fee'
							: 'User Wallet Fee'}
						:
						<Tooltip
							title={
								<Typography
									color={'white'}
									sx={{ fontSize: '14px' }}
								>
									This is the fee paid to process your
									transaction on the {capitalizeWord(chain)}{' '}
									blockchain. Larger transactions have higher
									fees.
								</Typography>
							}
							placement="right-start"
						>
							<HelpOutlineIcon
								sx={{ marginLeft: '6px', fontSize: '16px' }}
							/>
						</Tooltip>
					</Box>
					<Box component="span">
						{BigInt(userWalletFee) > 0
							? toFixed(convertDfmToApex(userWalletFee, chain), 6)
							: '0'}{' '}
						{currencyToken.label}
					</Box>
				</Typography>
			)}

			{bridgeTxFee && (
				<Typography
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
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
									{isLayerZeroMode
										? 'This fee covers the bridge blockchain transaction costs.'
										: `This fee covers the bridge blockchain transaction costs. This fee is set to the predefined minimum. When bridging native tokens, the minimum ${currencyToken.label} required to hold those tokens on ${capitalizeWord(chain)} is added.`}
								</Typography>
							}
							placement="right-start"
						>
							<HelpOutlineIcon
								sx={{ marginLeft: '6px', fontSize: '16px' }}
							/>
						</Tooltip>
					</Box>
					<Box component="span">
						{BigInt(bridgeTxFee) > 0
							? toFixed(convertDfmToApex(bridgeTxFee, chain), 6)
							: '0'}{' '}
						{currencyToken.label}
					</Box>
				</Typography>
			)}

			{isSkylineMode &&
				operationFee &&
				BigInt(operationFee) > BigInt(0) && (
					<Typography
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
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
							Bridge Operation Fee:
							<Tooltip
								title={
									<Typography
										color={'white'}
										sx={{ fontSize: '14px' }}
									>
										This fee covers the cost of operating
										the bridge, including maintaining
										balance between ADA and APEX during
										bridging.
									</Typography>
								}
								placement="right-start"
							>
								<HelpOutlineIcon
									sx={{ marginLeft: '6px', fontSize: '16px' }}
								/>
							</Tooltip>
						</Box>
						<Box component="span">
							{BigInt(operationFee) > 0
								? toFixed(
										convertDfmToApex(operationFee, chain),
										6,
									)
								: '0'}{' '}
							{currencyToken.label}
						</Box>
					</Typography>
				)}

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
				{isLayerZeroMode ? (
					<Box>{'1-5 minutes'}</Box>
				) : (
					<Box component="span">
						{isSkylineMode ? '28-35 minutes' : '16-20 minutes'}
					</Box>
				)}
			</Typography>
		</CustomBox>
	);
};

export default FeeInformation;
