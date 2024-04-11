import { ChangeEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import FilterList from '@mui/icons-material/FilterList';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import { Chain } from '../../features/enums';
import AppliedFiltersChips from './AppliedFiltersChips';
import { BridgeTransactionFilterDto } from '../../swagger/apexBridgeApiService';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
};

type FiltersProps = {
    filters: Partial<BridgeTransactionFilterDto>
    appliedFilters: Partial<BridgeTransactionFilterDto>
    handleAppliedFilterChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void
    handleFilterChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void
    applySelectedFilters: () => void
    getFilteredBridgeTransactions: () => void
    resetFilters: () => void
}

export default function Filters({ filters, handleFilterChange, appliedFilters, handleAppliedFilterChange, applySelectedFilters, getFilteredBridgeTransactions, resetFilters }: FiltersProps) {
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    
    function removeFilter(e: any) {
        handleFilterChange(e);
        handleAppliedFilterChange(e);
    }

    function handleApplyFilters() {
        applySelectedFilters();
        getFilteredBridgeTransactions();
        handleClose();
    }
    return (
        <div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AppliedFiltersChips appliedFilters={appliedFilters} removeFilter={removeFilter} resetFilters={resetFilters}/>
                <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={handleOpen}
                >
                    Filters
                </Button>
            </Box>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'left',
                            justifyContent: 'space-between',
                            flexDirection: 'column',
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <FormControl sx={{ minWidth: 220 }} variant="outlined" size='small'>
                            <InputLabel id="destination-chain-label">Destination Chain</InputLabel>
                            <Select
                                labelId="destination-chain-label"
                                id="destination-chain"
                                name='destinationChain'
                                label="Destination Chain"
                                variant="outlined"
                                value={filters.destinationChain}
                                onChange={(e)=>handleFilterChange(e)}
                            >
                                <MenuItem value={Chain.PRIME}>Prime</MenuItem>
                                <MenuItem value={Chain.VECTOR}>Vector</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            id="receiver-address"
                            name="receiverAddress"
                            label="Receiver Address"
                            variant="outlined"
                            size="small"
                            value={filters.receiverAddress}
                            onChange={(e)=>handleFilterChange(e)}
                        />
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    id="amount-from"
                                    name="amountFrom"
                                    label="Amount From"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={filters.amountFrom === 0 ? '' : filters.amountFrom}
                                    onChange={(e)=>handleFilterChange(e)}
                                />
                                <TextField
                                    id="amount-to"
                                    name="amountTo"
                                    label="Amount To"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={filters.amountTo === 0 ? '' : filters.amountTo}
                                    onChange={(e)=>handleFilterChange(e)}
                                />
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button variant="contained" color="primary" onClick={handleApplyFilters}>
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </div>
    );
}