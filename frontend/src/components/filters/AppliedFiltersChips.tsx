import { Box, Button, Chip } from "@mui/material";
import { useMemo } from "react";
import { BridgeTransactionFilterDto } from "../../swagger/apexBridgeApiService";

interface AppliedFiltersChipsProps {
    appliedFilters: Partial<BridgeTransactionFilterDto>;
    removeFilter: (event: any) => void;
    resetFilters: () => void;
}

function AppliedFiltersChips({ appliedFilters, removeFilter, resetFilters }: AppliedFiltersChipsProps) {
    const chipValues: Pick<BridgeTransactionFilterDto, 'amountTo' | 'amountFrom' | 'destinationChain' | 'receiverAddress'> = {
        amountTo: Number(appliedFilters.amountTo),
        amountFrom: Number(appliedFilters.amountFrom),
        destinationChain: appliedFilters.destinationChain,
        receiverAddress: appliedFilters.receiverAddress
    };
    const mapKeyToWord: { [key: string]: string } = {
        amountFrom: 'From',
        amountTo: 'To',
        destinationChain: 'Destination chain',
        receiverAddress: 'Receiver address'
    } as const;

    const chips = useMemo(() => Object.entries(chipValues).map(([key, value]) => value && (
        <Chip
            key={key}
            label={`${mapKeyToWord[key]}: ${value}`}
            onDelete={(e) => removeFilter({ ...e, ...{ target: { name: key, value: '' } } })}
            variant="outlined"
            size="small"
        />
    )).filter(c => c && c.props.label !== '' && c.props.label !== undefined), [chipValues, removeFilter]);


    return (
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* {chips} */}
            {chips.some(c => c && c.props.label !== '' && c.props.label !== undefined) &&
            <>
            {chips}
                <Button variant="text" sx={{ textTransform: 'none' }} onClick={resetFilters}>Clear all</Button>
            </>
            }
        </Box>
    )
}

export default AppliedFiltersChips;
