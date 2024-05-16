import { Box, Button, Chip } from "@mui/material";
import { useMemo } from "react";
import { BridgeTransactionFilterDto } from "../../swagger/apexBridgeApiService";
import { propertyOf } from '../../utils/propertyOf';

type Props = {
    filters: BridgeTransactionFilterDto;
    removeFilter: (propName: string) => void;
    resetFilters: () => void;
}

const mapKeyToWord: { [key: string]: string } = {
	amountFrom: 'From',
	amountTo: 'To',
	destinationChain: 'Destination chain',
	receiverAddress: 'Receiver address'
}

const filterProps: string[] = [
	'amountTo',
	'amountFrom',
	'destinationChain',
	'receiverAddress'
]

function AppliedFiltersChips({ filters, removeFilter, resetFilters }: Props) {

	const appliedFilters = useMemo(
		() => Object.entries(filters).filter(([key, value]) => value && filterProps.includes(key)),
		[filters]
	)
	
    const chips = useMemo(
		() => appliedFilters.map(([key, value]) => value && (
			<Chip
				key={key}
				label={`${mapKeyToWord[key]}: ${value}`}
				onDelete={() => removeFilter(key)}
				variant="outlined"
				size="small"
			/>
		)),
		[appliedFilters, removeFilter]
	);


    return (
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {chips.length > 0 && (
				<>
					{chips}
					<Button variant="text" sx={{ textTransform: 'none' }} onClick={resetFilters}>Clear all</Button>
				</>
			)}
        </Box>
    )
}

export default AppliedFiltersChips;
