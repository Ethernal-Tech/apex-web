import { Box, Button, Chip } from "@mui/material";
import { useMemo } from "react";
import { BridgeTransactionFilterDto } from "../../swagger/apexBridgeApiService";

type Props = {
    filters: BridgeTransactionFilterDto;
    removeFilter: (propName: string) => void;
    resetFilters: () => void;
}

const mapKeyToWord: { [key: string]: string } = {
	amountFrom: 'From',
	amountTo: 'To',
	destinationChain: 'Destination chain',
}

const filterProps: string[] = [
	'amountTo',
	'amountFrom',
	'destinationChain',
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
				sx={{
					color:'white',
					border: '1px solid #435F69',
					background:'#0751594D',
					'& .MuiChip-deleteIcon':{
						color:'#051D26',
						'&:hover':{
							color:'white',
						}
					}
				}}

			/>
		)),
		[appliedFilters, removeFilter]
	);


    return (
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {chips.length > 0 && (
				<>
					{chips}
					<Button variant="text" sx={{ textTransform: 'none', color:'red' }} onClick={resetFilters}>Clear all</Button>
				</>
			)}
        </Box>
    )
}

export default AppliedFiltersChips;
