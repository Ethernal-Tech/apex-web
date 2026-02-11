import { Box, Button, Chip } from '@mui/material';
import { useMemo } from 'react';
import { BridgeTransactionFilterDto } from '../../swagger/apexBridgeApiService';
import { primaryAccentColor } from '../../containers/theme';

type Props = {
	filters: BridgeTransactionFilterDto;
	removeFilter: (propName: string) => void;
	resetFilters: () => void;
};

const mapKeyToWord: { [key: string]: string } = {
	amountFrom: 'From',
	amountTo: 'To',
	receiverAddress: 'Receiver',
	destinationChain: 'Destination chain',
};

const filterProps: string[] = [
	'amountTo',
	'amountFrom',
	'receiverAddress',
	'destinationChain',
];

function AppliedFiltersChips({ filters, removeFilter, resetFilters }: Props) {
	const appliedFilters = useMemo(
		() =>
			Object.entries(filters).filter(
				([key, value]) => value && filterProps.includes(key),
			),
		[filters],
	);

	const chips = useMemo(
		() =>
			appliedFilters.map(
				([key, value]) =>
					value && (
						<Chip
							key={key}
							label={`${mapKeyToWord[key]}: ${value}`}
							onDelete={() => removeFilter(key)}
							variant="outlined"
							size="small"
							sx={{
								color: '#fff',
								border: '1px solid #383a40',
								backdropFilter: 'blur(14px)',
								padding: '2px 8px',
								'& .MuiChip-deleteIcon': {
									color: '#fff',
									'&:hover': {
										color: '#c9c7c7',
									},
								},
								'& .MuiChip-label': {
									paddingLeft: '8px',
									paddingBottom: '2px',
								},
							}}
						/>
					),
			),
		[appliedFilters, removeFilter],
	);

	return (
		<Box
			sx={{
				flexGrow: 1,
				display: 'flex',
				flexWrap: 'wrap',
				gap: 0.5,
				alignItems: 'center',
			}}
		>
			{chips.length > 0 && (
				<>
					{chips}
					<Button
						variant="text"
						sx={{
							textTransform: 'none',
							color: primaryAccentColor,
						}}
						onClick={resetFilters}
					>
						Clear all
					</Button>
				</>
			)}
		</Box>
	);
}

export default AppliedFiltersChips;
