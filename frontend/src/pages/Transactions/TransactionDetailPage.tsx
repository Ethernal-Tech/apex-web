import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { useCallback, useEffect, useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullPageSpinner from '../../components/spinner/Spinner';
import { TRANSACTIONS_ROUTE } from '../PageRouter';
import { BridgeTransactionDto } from '../../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../../utils/fetchUtils';
import { getAction } from './action';
import { getStatusIconAndLabel, isStatusFinal } from '../../utils/statusUtils';
import {
	capitalizeWord,
	convertDfmToApex,
	formatAddress,
	getChainLabelAndColor,
	toFixed,
} from '../../utils/generalUtils';
import { menuDark } from '../../containers/theme';
import Button from '../../components/Buttons/ButtonCustom';
import { openExplorer } from '../../utils/chainUtils';

const STATUS_FETCH_INTERVAL_MS = 5000;

const TransactionDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const [transaction, setTransaction] = useState<
		BridgeTransactionDto | undefined
	>(undefined);
	const navigate = useNavigate();

	const fetchTx = useCallback(async () => {
		if (id) {
			const bindedAction = getAction.bind(null, parseInt(id));

			const response = await tryCatchJsonByAction(bindedAction);
			if (!(response instanceof ErrorResponse)) {
				setTransaction(response);
				return response;
			}
		}
	}, [id]);

	useEffect(() => {
		fetchTx();

		const handle = setInterval(async () => {
			const tx = await fetchTx();
			if (tx && isStatusFinal(tx.status)) {
				clearInterval(handle);
			}
		}, STATUS_FETCH_INTERVAL_MS);

		return () => {
			clearInterval(handle);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onOpenExplorer = () => openExplorer(transaction);

	return (
		<BasePage>
			{!transaction && <FullPageSpinner />}
			<Box
				sx={{
					mb: 2,
					display: 'flex',
					alignSelf: 'start',
					color: 'white',
				}}
			>
				<Box>
					<Link
						component={RouterLink}
						to={TRANSACTIONS_ROUTE}
						sx={{
							mr: 1,
							color: 'inherit',
							textDecoration: 'none',
							display: 'flex',
							justifyContent: 'center',
							gap: 2,
						}}
					>
						<Typography variant="body1">
							<ArrowBackIcon />
						</Typography>
						<Typography variant="body1">
							Back to transactions
						</Typography>
					</Link>
				</Box>
			</Box>
			<Box
				sx={{
					my: 2,
					color: 'white',
					background: menuDark,
					border: '1px solid #435F69',
					borderRadius: '4px',
					width: '600px',
				}}
			>
				<Box sx={{ px: '45px', py: '40px', fontWeight: '500' }}>
					<Box
						sx={{
							flex: '1 1 50%',
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						<Box
							sx={{
								mb: 1,
								paddingBottom: '40px',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography
								fontSize={'18px'}
								fontWeight={600}
								lineHeight={'24px'}
								variant="h2"
							>
								Transaction Details
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Source Chain:
							</Typography>
							<Box component={'div'}>
								<Box
									component="span"
									sx={{
										display: 'inline-block',
										color: 'white',
										bgcolor:
											transaction &&
											getChainLabelAndColor(
												transaction.originChain,
											).color,
										borderRadius: '50%',
										width: 24,
										height: 24,
										textAlign: 'center',
										lineHeight: '26px',
										marginRight: 1,
									}}
								>
									{transaction &&
										getChainLabelAndColor(
											transaction.originChain,
										).letter}
								</Box>
								<Typography
									variant="body1"
									fontSize={'16px'}
									sx={{
										fontWeight: '500',
										display: 'inline-block',
									}}
								>
									{capitalizeWord(
										transaction?.originChain || '',
									)}
								</Typography>
							</Box>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Destination Chain:
							</Typography>
							<Box component={'div'}>
								<Box
									component="span"
									sx={{
										display: 'inline-block',
										color: 'white',
										bgcolor:
											transaction &&
											getChainLabelAndColor(
												transaction.destinationChain,
											).color,
										borderRadius: '50%',
										width: 24,
										height: 24,
										textAlign: 'center',
										lineHeight: '26px',
										marginRight: 1,
									}}
								>
									{transaction &&
										getChainLabelAndColor(
											transaction.destinationChain,
										).letter}
								</Box>
								<Typography
									variant="body1"
									fontSize={'16px'}
									sx={{
										fontWeight: '500',
										display: 'inline-block',
									}}
								>
									{capitalizeWord(
										transaction?.destinationChain || '',
									)}
								</Typography>
							</Box>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">Amount:</Typography>
							<Typography
								variant="body1"
								fontSize={'16px'}
								sx={{ fontWeight: '500' }}
							>
								{transaction &&
									toFixed(
										convertDfmToApex(
											transaction?.amount,
											transaction?.originChain,
										),
										6,
									)}{' '}
								APEX
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Sender address:
							</Typography>
							<Typography
								variant="body1"
								fontSize={'16px'}
								sx={{ fontWeight: '500' }}
							>
								{formatAddress(transaction?.senderAddress)}
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Receiver addresses:
							</Typography>
							<Typography
								variant="body1"
								fontSize={'16px'}
								sx={{ fontWeight: '500' }}
							>
								{formatAddress(transaction?.receiverAddresses)}
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Date created:
							</Typography>
							<Typography
								variant="body1"
								fontSize={'16px'}
								sx={{ fontWeight: '500' }}
							>
								{transaction?.createdAt.toLocaleString()}
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
								borderBottom: '1px solid #142E38',
							}}
						>
							<Typography variant="subtitle2">
								Date finished:
							</Typography>
							<Typography
								variant="body1"
								fontSize={'16px'}
								sx={{ fontWeight: '500' }}
							>
								{transaction?.finishedAt?.toLocaleString() ||
									'/'}
							</Typography>
						</Box>
						<Box
							sx={{
								mb: 1,
								pb: 1,
								display: 'flex',
								justifyContent: 'space-between',
							}}
						>
							<Typography variant="subtitle2">Status:</Typography>
							<Box sx={{ display: 'flex' }}>
								<Box
									sx={{ marginRight: 1 }}
									component="img"
									src={
										(transaction &&
											getStatusIconAndLabel(
												transaction.status,
											).icon) ||
										''
									}
									alt=""
								/>
								<Typography
									sx={{
										textTransform: 'capitalize',
										display: 'inline-block',
									}}
								>
									{transaction &&
										getStatusIconAndLabel(
											transaction.status,
										).label}
								</Typography>
							</Box>
						</Box>
					</Box>
					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2,1fr)',
							gap: '10px',
						}}
					>
						{/* {transaction && <VerticalStepper steps={transaction?.steps}/>} */}
						<Button
							variant="red"
							onClick={() => navigate(TRANSACTIONS_ROUTE)}
						>
							Close
						</Button>

						<Button onClick={onOpenExplorer}>View Explorer</Button>
					</Box>
				</Box>
			</Box>
		</BasePage>
	);
};

export default TransactionDetailPage;
