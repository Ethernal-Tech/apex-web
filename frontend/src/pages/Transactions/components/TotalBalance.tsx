import { Box, Typography } from '@mui/material';
import { convertDfmToApex, toFixed } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { getTokenInfo } from '../../../settings/token';
import { getChainInfo } from '../../../settings/chain';

const TotalBalance = () => {
	const totalDfmBalance = useSelector(
		(state: RootState) => state.accountInfo.balance,
	);
	const chain = useSelector((state: RootState) => state.chain.chain);
	const totalBalanceInApex = totalDfmBalance
		? toFixed(convertDfmToApex(totalDfmBalance, chain), 6)
		: null;

	const chainCurrency = getChainInfo(chain).currencyToken;

	return (
		<Box>
			{totalBalanceInApex && (
				<Box
					display="flex"
					flexDirection="column"
					alignItems="end"
					color="#828282"
				>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'end',
							alignItems: 'center',
						}}
					>
						<Box>
							<Typography
								component="span"
								color="#828282"
								fontSize="13px"
							>
								Balance:
							</Typography>
							<Typography
								component="span"
								color="#fff"
								fontWeight="700"
								fontSize="13px"
							>
								{' ' + totalBalanceInApex.split('.')[0]}
							</Typography>

							{/* show decimals if applicable */}
							{totalBalanceInApex.includes('.') && (
								<Typography
									component="span"
									fontWeight="400"
									fontSize="13px"
								>
									.{totalBalanceInApex.split('.')[1]}
								</Typography>
							)}

							<Typography component="span" fontSize="13px">
								{' ' + getTokenInfo(chainCurrency).label}
							</Typography>
						</Box>
					</Box>
					{/* <Typography>&#36;5,000.00</Typography> */}
				</Box>
			)}
		</Box>
	);
};

export default TotalBalance;
