import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import FilterList from '@mui/icons-material/FilterList';
import {
	FormControl,
	InputLabel,
	lighten,
	MenuItem,
	Select,
	SelectChangeEvent,
	TextField,
	Typography,
} from '@mui/material';
import AppliedFiltersChips from './AppliedFiltersChips';
import {
	BridgeTransactionFilterDto,
	ChainEnum,
	TransactionStatusEnum,
} from '../../swagger/apexBridgeApiService';
import { capitalizeWord } from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import styled from '@emotion/styled';

const StyledFormControl = styled(FormControl)({
	'& .MuiSelect-select': {
		backgroundColor: '#1a2e3b',
		borderColor: '#1a2e3b',
		color: 'white',
	},
	'& .MuiSvgIcon-root': {
		color: 'white',
	},

	'& .MuiOutlinedInput-notchedOutline': {
		borderColor: '#1a2e3b',
	},
});

const CustomMenuItem = styled(MenuItem)({
	color: '#ffffff',
	'&:hover': {
		backgroundColor: lighten('#424543', 0.1),
	},
});

const style = {
	position: 'absolute' as const,
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	backgroundColor: '#242625',
	p: 4,
	color: 'white',
	width: '400px',
	border: '1px solid #383a40',
	borderRadius: '12px',
};

const receiverAddressStyle = {
	'& .MuiOutlinedInput-root': {
		'& fieldset': {
			borderColor: '#435F69',
			borderRadius: '12px',
		},
		'&:hover fieldset': {
			borderColor: '#435F69',
		},
		'&.Mui-focused fieldset': {
			borderColor: '#435F69',
		},
		border: 'none',
		color: 'white',
		padding: '0 8px 0 0',
		width: '100%',
		caretColor: '#FF5E5E',
	},
	input: {
		color: 'white',
		caretColor: '#FF5E5E',
		'&::placeholder': {
			color: '#a3a3a3',
			opacity: 1,
			fontFamily: 'monospace', // Adjust as needed to match the style
		},
		// Hide number input arrows
		'&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
			display: 'none',
		},
		webkitAppearance: 'none',
		'&[type=number]': {
			mozAppearance: 'textfield', // Firefox
		},
	},
};

const amountStyle = {
	'& .MuiOutlinedInput-root': {
		backgroundColor: 'transparent',
		'& fieldset': {
			borderColor: '#435F69',
			borderRadius: '12px',
		},
		'&:hover fieldset': {
			borderColor: '#435F69',
		},
		'&.Mui-focused fieldset': {
			borderColor: '#435F69',
		},
		border: 'none',
		color: 'white',
	},
	'& .MuiOutlinedInput-notchedOutline': {
		borderColor: '#1a2e3b',
	},
	input: {
		color: 'white',
		caretColor: '#FF5E5E',
		'&::placeholder': {
			color: '#a3a3a3',
			opacity: 1,
			fontFamily: 'monospace', // Adjust as needed to match the style
		},
		// Hide number input arrows
		'&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
			display: 'none',
		},
		webkitAppearance: 'none',
		'&[type=number]': {
			mozAppearance: 'textfield', // Firefox
		},
	},
};

type Props = {
	filters: BridgeTransactionFilterDto;
	onFilterChange: (newFilters: BridgeTransactionFilterDto) => void;
};

export default function Filters({ filters, onFilterChange }: Props) {
	const [values, setValues] = useState(
		new BridgeTransactionFilterDto(filters),
	);
	const [open, setOpen] = useState(false);

	const chain = useSelector((state: RootState) => state.chain.chain);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);

	const enabledChains = useSelector(
		(state: RootState) => state.settings.enabledChains,
	);
	const destinationChains = useMemo(
		() =>
			Object.values(ChainEnum).filter(
				(x) => x !== chain && enabledChains.includes(x),
			),
		[chain, enabledChains],
	);

	const removeFilterCallback = useCallback(
		(propName: string) => {
			// eslint-disable-next-line no-prototype-builtins
			if (filters.hasOwnProperty(propName)) {
				onFilterChange(
					new BridgeTransactionFilterDto({
						...filters,
						[propName]: undefined,
					}),
				);
			}
		},
		[filters, onFilterChange],
	);

	useEffect(() => {
		setValues(new BridgeTransactionFilterDto(filters));
	}, [filters]);

	const applyFiltersCallback = useCallback(() => {
		onFilterChange(new BridgeTransactionFilterDto(values));
		setOpen(false);
	}, [onFilterChange, values]);

	const resetFiltersCallback = useCallback(() => {
		// keep sort
		onFilterChange(
			new BridgeTransactionFilterDto({
				originChain: chain,
				senderAddress: account,
				order: filters.order,
				orderBy: filters.orderBy,
			}),
		);
	}, [onFilterChange, chain, account, filters.order, filters.orderBy]);

	const changeCallback = useCallback(
		(
			e:
				| React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
				| SelectChangeEvent<TransactionStatusEnum>
				| SelectChangeEvent<ChainEnum>,
		) => {
			setValues(
				(state) =>
					new BridgeTransactionFilterDto({
						...state,
						page: 0,
						[e.target.name]: e.target.value,
					}),
			);
		},
		[],
	);

	const handlePasteReceiverAddress = async () => {
		try {
			const text = await navigator.clipboard.readText();
			setValues(
				(state) =>
					new BridgeTransactionFilterDto({
						...state,
						receiverAddress: text,
					}),
			);
		} catch (err) {
			console.error('Failed to read clipboard contents: ', err);
		}
	};

	return (
		<>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 1,
					mb: 1,
				}}
			>
				<AppliedFiltersChips
					filters={filters}
					removeFilter={removeFilterCallback}
					resetFilters={resetFiltersCallback}
				/>
				<Button
					variant="outlined"
					onClick={() => setOpen(true)}
					sx={{
						color: '#d4d4d4',
						borderColor: '#34363b',
						minWidth: 'unset',
						padding: '5px',
						borderRadius: '12px',
						'&:hover': {
							borderColor: '#adadad',
						},
					}}
				>
					<FilterList />
				</Button>
			</Box>
			<Modal
				open={open}
				onClose={() => setOpen(false)}
				aria-labelledby="modal-modal-title"
				aria-describedby="modal-modal-description"
			>
				<Box sx={style}>
					<Box sx={{ mb: 2 }}>
						<Typography variant="h6">Filter</Typography>

						<InputLabel
							sx={{
								color: 'white',
								fontSize: '14px',
								mb: 0.5,
								mt: 2,
							}}
							id="destination-chain-label"
						>
							Destination Chain
						</InputLabel>
						<StyledFormControl
							sx={{ width: '100%' }}
							variant="outlined"
							size="small"
						>
							<Select
								id="destination-chain"
								labelId="destination-chain-label"
								name="destinationChain"
								variant="outlined"
								value={values.destinationChain}
								onChange={changeCallback}
								sx={{
									borderRadius: '12px',
									'& .MuiSelect-select': {
										backgroundColor: '#424543',
										borderRadius: '12px',
									},
									'& .MuiOutlinedInput-root': {
										'& fieldset': {
											borderRadius: '12px',
											backgroundColor: '#424543',
										},
									},
								}}
								MenuProps={{
									PaperProps: {
										sx: {
											bgcolor: '#242625',
											borderRadius: '12px',
											'& .MuiMenuItem-root': {
												color: '#ffffff',
											},
										},
									},
								}}
							>
								{destinationChains.map((chain) => (
									<CustomMenuItem key={chain} value={chain}>
										{capitalizeWord(chain)}
									</CustomMenuItem>
								))}
							</Select>
						</StyledFormControl>

						<InputLabel
							sx={{
								color: 'white',
								fontSize: '14px',
								mb: 0.5,
								mt: 2,
							}}
							id="receiver-address"
						>
							Receiver Address
						</InputLabel>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								position: 'relative',
							}}
						>
							<TextField
								id="receiver-address"
								name="receiverAddress"
								variant="outlined"
								size="small"
								value={values.receiverAddress}
								onChange={changeCallback}
								sx={{
									width: '100%',
									...receiverAddressStyle,
								}}
							/>
							{!values.receiverAddress && (
								<Button
									variant="text"
									onClick={handlePasteReceiverAddress}
									sx={{
										color: '#F27B50',
										backgroundColor: 'transparent',
										position: 'absolute',
										top: '50%',
										transform: 'translateY(-50%)',
										right: 0,
										'&:hover': {
											backgroundColor: 'transparent',
											color: '#ed8a66',
										},
									}}
								>
									PASTE
								</Button>
							)}
						</Box>

						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 2,
								mt: 2,
								mb: 0.5,
							}}
						>
							<Box>
								<Typography sx={{ fontSize: '14px' }}>
									Amount From
								</Typography>
								<TextField
									id="amount-from"
									name="amountFrom"
									type="number"
									variant="outlined"
									size="small"
									value={values.amountFrom}
									onChange={changeCallback}
									sx={amountStyle}
								/>
							</Box>
							<Box>
								<Typography sx={{ fontSize: '14px' }}>
									Amount To
								</Typography>
								<TextField
									id="amount-to"
									name="amountTo"
									type="number"
									variant="outlined"
									size="small"
									value={values.amountTo}
									onChange={changeCallback}
									sx={amountStyle}
								/>
							</Box>
						</Box>
					</Box>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'flex-end',
							gap: 2,
						}}
					>
						<Button
							onClick={() => setOpen(false)}
							sx={{
								color: 'white',
								borderColor: '#f0a500',
								borderRadius: '12px',
								'&:hover': {
									backgroundColor: 'transparent',
									borderColor: '#f0a500',
								},
							}}
						>
							Cancel
						</Button>
						<Button
							variant="contained"
							sx={{
								backgroundColor: '#F27B50',
								borderRadius: '12px',
								'&:hover': {
									backgroundColor: '#ed8a66',
								},
							}}
							onClick={applyFiltersCallback}
						>
							Apply
						</Button>
					</Box>
				</Box>
			</Modal>
		</>
	);
}
