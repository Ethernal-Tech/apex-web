import { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TablePagination,
	Box,
	TableSortLabel,
	SortDirection,
	Typography,
} from '@mui/material';
import BasePage from '../base/BasePage';
import { Link } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import {
	BridgeTransactionFilterDto,
	BridgeTransactionResponseDto,
} from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';
import { getAllFilteredAction } from './action';
import { ErrorResponse, tryCatchJsonByAction } from '../../utils/fetchUtils';
import { getStatusIconAndLabel, isStatusFinal } from '../../utils/statusUtils';
import {
	capitalizeWord,
	convertApexToDfm,
	convertDfmToApex,
	formatAddress,
	formatTxDetailUrl,
	toFixed,
} from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { getChainInfo } from '../../settings/chain';
import { primaryAccentColor } from '../../containers/theme';

const TransactionsTablePage = () => {
	const [transactions, setTransactions] = useState<
		BridgeTransactionResponseDto | undefined
	>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const tableRef = useRef(null);

	const chain = useSelector((state: RootState) => state.chain.chain);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);

	const [filters, setFilters] = useState(
		new BridgeTransactionFilterDto({
			originChain: chain,
			senderAddress: account,
		}),
	);

	const fetchDataCallback = useCallback(
		async (hideLoading = false) => {
			if (!filters.senderAddress) {
				return;
			}

			const filtersCorrected = new BridgeTransactionFilterDto({
				...filters,
			});
			if (filtersCorrected.amountFrom) {
				filtersCorrected.amountFrom = convertApexToDfm(
					filtersCorrected.amountFrom,
					chain,
				);
			}

			if (filtersCorrected.amountTo) {
				filtersCorrected.amountTo = convertApexToDfm(
					filtersCorrected.amountTo,
					chain,
				);
			}

			!hideLoading && setIsLoading(true);
			const bindedAction = getAllFilteredAction.bind(
				null,
				filtersCorrected,
			);

			const response = await tryCatchJsonByAction(bindedAction);

			if (!(response instanceof ErrorResponse)) {
				setTransactions(response);
				!hideLoading && setIsLoading(false);

				return response;
			}

			!hideLoading && setIsLoading(false);
		},
		[chain, filters],
	);

	useEffect(() => {
		setFilters(
			(state) =>
				new BridgeTransactionFilterDto({
					...state,
					senderAddress: account,
				}),
		);
	}, [account]);

	useEffect(() => {
		fetchDataCallback();
	}, [fetchDataCallback]);

	useEffect(() => {
		const handle = setInterval(async () => {
			const resp = await fetchDataCallback(true);
			if (resp && resp.items.every((x) => isStatusFinal(x.status))) {
				clearInterval(handle);
			}
		}, 5000);

		return () => {
			clearInterval(handle);
		};
	}, [fetchDataCallback]);

	const handleChangePage = (_: any, page: number) => {
		setFilters(
			(state) =>
				new BridgeTransactionFilterDto({
					...state,
					page,
				}),
		);
	};

	const handleChangeRowsPerPage = (
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setFilters(
			(state) =>
				new BridgeTransactionFilterDto({
					...state,
					page: 0,
					perPage: parseInt(event.target.value),
				}),
		);
	};

	const createSortHandler =
		(property: string) => (_: React.MouseEvent<unknown>) => {
			const isAsc =
				filters.orderBy === property && filters.order === 'asc';
			setFilters(
				new BridgeTransactionFilterDto({
					...filters,
					page: 0,
					order: isAsc ? 'desc' : 'asc',
					orderBy: property,
				}),
			);
		};

	return (
		<BasePage>
			{isLoading && <FullPageSpinner />}
			<Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
				<Filters filters={filters} onFilterChange={setFilters} />
			</Box>
			<TableContainer
				component={Paper}
				ref={tableRef}
				sx={{
					border: '1px solid #34363b',
					background: 'transparent',
					backdropFilter: 'blur(14px)',
					borderRadius: '12px',
					padding: '10px 16px',
				}}
			>
				<Table>
					<TableHead>
						<TableRow>
							{headCells.map((headCell) => (
								<TableCell
									key={headCell.id}
									padding="normal"
									sortDirection={
										filters.orderBy === headCell.id
											? (filters.order as SortDirection)
											: false
									}
									sx={{
										cursor: 'default',
										color: 'white',
										borderBottom: '1px solid #435F694D',
										fontSize: '14px',
										fontWeight: 500,
										textTransform: 'uppercase',
									}}
								>
									{headCell.id === 'actions' ? (
										headCell.label
									) : (
										<TableSortLabel
											active={
												filters.orderBy === headCell.id
											}
											direction={
												filters.orderBy === headCell.id
													? (filters.order as
															| 'desc'
															| 'asc')
													: 'asc'
											}
											onClick={createSortHandler(
												headCell.id,
											)}
											sx={{
												'&:hover': {
													color: '#a6a6a6',
													'& .MuiSvgIcon-root': {
														color: '#a6a6a6',
													},
												},
												'&.Mui-active': {
													color: '#a6a6a6',
													'& .MuiSvgIcon-root': {
														color: '#a6a6a6',
													},
												},
											}}
										>
											{headCell.label}
											{filters.orderBy === headCell.id ? (
												<Box
													component="span"
													sx={{
														...visuallyHidden,
													}}
												>
													{filters.order === 'desc'
														? 'sorted descending'
														: 'sorted ascending'}
												</Box>
											) : null}
										</TableSortLabel>
									)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{transactions?.items.map((transaction) => (
							<TableRow
								key={`tx-${transaction.id}`}
								sx={{
									borderBottom: '1px solid #435F694D',
									'&:last-child': {
										borderBottom: 'none',
									},
								}}
							>
								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									<Box
										component="span"
										sx={{
											display: 'inline-block',
											color: 'white',
											bgcolor: getChainInfo(
												transaction.originChain,
											).mainColor,
											borderRadius: '50%',
											width: 24,
											height: 24,
											textAlign: 'center',
											lineHeight: '24px',
											marginRight: 1,
										}}
									>
										{
											getChainInfo(
												transaction.originChain,
											).letter
										}
									</Box>
									{capitalizeWord(transaction.originChain)}
								</TableCell>
								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									<Box
										component="span"
										sx={{
											display: 'inline-block',
											color: 'white',
											bgcolor: getChainInfo(
												transaction.destinationChain,
											).mainColor,
											borderRadius: '50%',
											width: 24,
											height: 24,
											textAlign: 'center',
											lineHeight: '24px',
											marginRight: 1,
										}}
									>
										{
											getChainInfo(
												transaction.destinationChain,
											).letter
										}
									</Box>
									{capitalizeWord(
										transaction.destinationChain,
									)}
								</TableCell>
								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									{toFixed(
										convertDfmToApex(
											transaction.amount,
											transaction.originChain,
										),
										6,
									)}{' '}
									AP3X
								</TableCell>

								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									{formatAddress(
										transaction.receiverAddresses,
									)}
								</TableCell>

								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									{transaction.createdAt.toLocaleString()}
								</TableCell>
								<TableCell
									sx={{
										textAlign: transaction.finishedAt
											? 'left'
											: 'center',
										color: 'white',
										borderBottom: 'none',
									}}
								>
									{transaction.finishedAt?.toLocaleString() ||
										'/'}
								</TableCell>
								<TableCell
									sx={{
										color: 'white',
										borderBottom: 'none',
									}}
								>
									<Box sx={{ display: 'flex' }}>
										<Box
											sx={{ marginRight: 1 }}
											component="img"
											src={
												getStatusIconAndLabel(
													transaction.status,
													transaction.isRefund,
												).icon || ''
											}
											alt=""
										/>
										<Typography
											sx={{
												textTransform: 'capitalize',
												display: 'inline-block',
												fontSize: '14px',
											}}
										>
											{
												getStatusIconAndLabel(
													transaction.status,
													transaction.isRefund,
												).label
											}
										</Typography>
									</Box>
								</TableCell>
								<TableCell sx={{ borderBottom: 'none' }}>
									<Link
										style={{
											color: primaryAccentColor,
											background: 'none',
											textDecoration: 'none',
											fontSize: '14px',
											fontWeight: 500,
										}}
										to={formatTxDetailUrl(transaction)}
									>
										View Details
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
			{!!transactions?.total && (
				<TablePagination
					component="div"
					count={transactions.total}
					page={transactions.page}
					rowsPerPage={transactions.perPage}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					sx={{
						color: 'white',
						'& .MuiSelect-icon': {
							color: 'white',
							'&.Mui-disabled': {
								color: '#435F694D',
							},
						},
						'& .MuiTablePagination-actions .MuiButtonBase-root ': {
							color: 'white',
							'&.Mui-disabled': {
								color: '#435F694D',
							},
						},
					}}
				/>
			)}
		</BasePage>
	);
};

export default TransactionsTablePage;
