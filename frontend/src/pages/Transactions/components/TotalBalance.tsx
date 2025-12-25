import { Box, Tooltip, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { ReactComponent as WalletIcon } from '../../../assets/icons/moneyWallet.svg';
import { ReactComponent as ApexIcon } from '../../../assets/icons/apexTransferIcon.svg';
import { convertDfmToApex, toFixed } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import appSettings from '../../../settings/appSettings';
import { apexID, getCurrencyID, getTokenInfo } from '../../../settings/token';
import { BridgingModeEnum, getBridgingMode } from '../../../settings/chain';
import { formatBalance } from '../../../utils/tokenUtils';

interface TotalBalanceProps {
	tokenID?: number;
}

const TotalBalance = ({ tokenID }: TotalBalanceProps) => {
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const { chain, destinationChain } = useSelector(
		(state: RootState) => state.chain,
	);
	const settings = useSelector((state: RootState) => state.settings);

	const bridgingModeInfo = getBridgingMode(
		settings,
		chain,
		destinationChain,
		tokenID || 0,
	);
	const isSkylineMode = tokenID
		? bridgingModeInfo.bridgingMode === BridgingModeEnum.Skyline
		: appSettings.isSkyline;
	const isLayerZeroMode =
		bridgingModeInfo.bridgingMode === BridgingModeEnum.LayerZero;

	const currencyID = getCurrencyID(settings, chain) || apexID;
	const showToken = tokenID && currencyID && tokenID !== currencyID;

	const currencyBalance = totalDfmBalance[currencyID]
		? toFixed(convertDfmToApex(totalDfmBalance[currencyID], chain), 6)
		: null;
	const tokenBalance =
		(isSkylineMode || isLayerZeroMode) &&
		showToken &&
		totalDfmBalance[tokenID]
			? toFixed(convertDfmToApex(totalDfmBalance[tokenID], chain), 6)
			: null;

	if (isSkylineMode || isLayerZeroMode) {
		return (
			<Box
				px={'17px'}
				py="20px"
				sx={{
					border: '1px solid #077368',
					color: '#A1B3A0',
					background: 'transparent',
					borderRadius: '4px',
					fontWeight: '500',
				}}
			>
				<Typography
					textTransform={'uppercase'}
					color={'white'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<WalletIcon />
					<Box component="span" ml={1}>
						Available Balance
					</Box>
					<Tooltip
						title={
							isLayerZeroMode ? (
								// TODO: Set desired sentences for layer zero briding.
								<Typography
									color={'white'}
									sx={{ fontSize: '14px' }}
								>
									This balance reflects the total amount of
									tokens available on the source chain for
									LayerZero bridging. It does not include any
									unconfirmed transfers, pending approvals, or
									tokens that are locked on the destination
									chain.
								</Typography>
							) : (
								<Typography
									color={'white'}
									sx={{ fontSize: '14px' }}
								>
									This balance reflects the total value of all
									UTXOs associated with your address. It does
									not include any additional funds, such as
									rewards held in your staking (reward)
									account.
								</Typography>
							)
						}
						placement="right-start"
					>
						<HelpOutlineIcon
							sx={{ marginLeft: '6px', fontSize: '16px' }}
						/>
					</Tooltip>
				</Typography>

				{currencyBalance && (
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							overflow: 'hidden',
						}}
					>
						<Typography>
							<Box
								component="span"
								sx={{
									color: appSettings.isSkyline
										? '#1ea29d'
										: '#F25041',
									fontWeight: '600',
									fontSize: '32px',
								}}
							>
								{formatBalance(currencyBalance.split('.')[0])}
							</Box>

							{/* show decimals if applicable */}
							{currencyBalance.includes('.') && (
								<Box component="span" sx={{ fontSize: '20px' }}>
									.{currencyBalance.split('.')[1]}
								</Box>
							)}
						</Typography>
						<Typography sx={{ ml: 1 }}>
							{getTokenInfo(currencyID).label}
						</Typography>
					</Box>
				)}

				{tokenBalance && showToken && (
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							overflow: 'hidden',
						}}
					>
						<Typography>
							<Box
								component="span"
								sx={{
									color: appSettings.isSkyline
										? '#1ea29d'
										: '#F25041',
									fontWeight: '600',
									fontSize: '32px',
								}}
							>
								{formatBalance(tokenBalance.split('.')[0])}
							</Box>

							{/* show decimals if applicable */}
							{tokenBalance.includes('.') && (
								<Box component="span" sx={{ fontSize: '20px' }}>
									.{tokenBalance.split('.')[1]}
								</Box>
							)}
						</Typography>
						<Typography sx={{ ml: 1 }}>
							{getTokenInfo(tokenID).label}
						</Typography>
					</Box>
				)}
			</Box>
		);
	}

	return (
		<Box
			px={'17px'}
			py="20px"
			sx={{
				border: '1px solid #077368',
				color: '#A1B3A0',
				background: '#075159',
				borderRadius: '4px',
				fontWeight: '500',
			}}
		>
			<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
				<Typography
					textTransform={'uppercase'}
					color={'white'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<WalletIcon />
					<Box component="span" ml={1}>
						Available Balance
					</Box>
					<Tooltip
						title={
							<Typography
								color={'white'}
								sx={{ fontSize: '14px' }}
							>
								This balance reflects the total value of all
								UTXOs associated with your address. It does not
								include any additional funds, such as rewards
								held in your staking (reward) account.
							</Typography>
						}
						placement="right-start"
					>
						<HelpOutlineIcon
							sx={{ marginLeft: '6px', fontSize: '16px' }}
						/>
					</Tooltip>
				</Typography>

				<Typography
					textTransform={'uppercase'}
					sx={{ display: 'flex', alignItems: 'center' }}
				>
					<ApexIcon />
					<Box component="span" ml={1}>
						Apex
					</Box>
				</Typography>
			</Box>

			{currencyBalance && (
				<Typography>
					<Box
						component="span"
						sx={{
							color: '#F25041',
							fontWeight: '600',
							fontSize: '32px',
							lineheight: '32px',
						}}
					>
						{formatBalance(currencyBalance.split('.')[0])}
					</Box>

					{/* show decimals if applicable */}
					{currencyBalance.includes('.') && (
						<Box
							component="span"
							sx={{ fontSize: '20px', lineheight: '24px' }}
						>
							.{currencyBalance.split('.')[1]}
						</Box>
					)}
				</Typography>
			)}

			{/* <Typography>&#36;5,000.00</Typography> */}
		</Box>
	);
};

export default TotalBalance;
