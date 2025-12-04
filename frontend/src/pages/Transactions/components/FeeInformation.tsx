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
import { BridgingModeEnum } from '../../../settings/chain';
import { getCurrencyID, getTokenInfo } from '../../../settings/token';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';

const CustomBox = styled(Box)({
	background: '#075159',
});

interface FeeInformationProps {
	sx?: SxProps<Theme>;
	userWalletFee: string;
	bridgeTxFee: string;
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
	const settings = useSelector((s: RootState) => s.settings);
	const currencyToken = getTokenInfo(getCurrencyID(settings, chain));
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
				<Box
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
						<Typography>
							{isLayerZeroMode
								? 'Estimated Network Fee'
								: 'User Wallet Fee'}
							:
						</Typography>
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
						<Typography>
							{BigInt(userWalletFee) > 0
								? toFixed(
										convertDfmToApex(userWalletFee, chain),
										6,
									)
								: '0'}{' '}
							{currencyToken.label}
						</Typography>
					</Box>
				</Box>
			)}

			{bridgeTxFee && (
				<Box
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
						<Typography>Bridge Transaction Fee:</Typography>
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
						<Typography>
							{BigInt(bridgeTxFee) > 0
								? toFixed(
										convertDfmToApex(bridgeTxFee, chain),
										6,
									)
								: '0'}{' '}
							{currencyToken.label}
						</Typography>
					</Box>
				</Box>
			)}

			{isSkylineMode &&
				operationFee &&
				BigInt(operationFee) > BigInt(0) && (
					<Box
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
							<Typography>Bridge Operation Fee:</Typography>
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
							<Typography>
								{BigInt(operationFee) > 0
									? toFixed(
											convertDfmToApex(
												operationFee,
												chain,
											),
											6,
										)
									: '0'}{' '}
								{currencyToken.label}
							</Typography>
						</Box>
					</Box>
				)}

			<Box
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
					<Typography>Estimated time</Typography>
				</Box>
				{isLayerZeroMode ? (
					<Box>
						<Typography>{'1-5 minutes'}</Typography>
					</Box>
				) : (
					<Box component="span">
						<Typography>
							{isSkylineMode ? '28-35 minutes' : '16-20 minutes'}
						</Typography>
					</Box>
				)}
			</Box>
		</CustomBox>
	);
};

export default FeeInformation;
