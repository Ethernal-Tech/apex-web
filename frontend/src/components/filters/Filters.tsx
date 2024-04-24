import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import FilterList from '@mui/icons-material/FilterList';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import AppliedFiltersChips from './AppliedFiltersChips';
import { BridgeTransactionFilterDto, ChainEnum, TransactionStatusEnum } from '../../swagger/apexBridgeApiService';
import { propertyOf } from '../../utils/propertyOf';

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

type Props = {
    filters: BridgeTransactionFilterDto
    onFilterChange: (newFilters: BridgeTransactionFilterDto) => void
}

export default function Filters({ filters, onFilterChange }: Props) {
	const [values, setValues] = useState(new BridgeTransactionFilterDto(filters));
    const [open, setOpen] = useState(false);

	const removeFilterCallback = useCallback(
		(propName: string) => {
			if (filters.hasOwnProperty(propName)) {
				onFilterChange(new BridgeTransactionFilterDto({
					...filters,
					[propName]: undefined
				}))
			}
		},
		[filters, onFilterChange]
	)

	useEffect(
		() => {
			setValues(new BridgeTransactionFilterDto(filters))
		},
		[filters]
	)

    const applyFiltersCallback = useCallback(
		() => {
			onFilterChange(new BridgeTransactionFilterDto(values))
			setOpen(false);
		},
		[onFilterChange, values]
	)

	const resetFiltersCallback = useCallback(
		() => {
			// keep sort
			onFilterChange(new BridgeTransactionFilterDto({
				order: filters.order,
				orderBy: filters.orderBy,
			}))
		},
		[onFilterChange, filters.order, filters.orderBy]
	)

	const changeCallback = useCallback(
		(e:  React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<TransactionStatusEnum>) => {
			setValues((state) => new BridgeTransactionFilterDto({
				...state,
				page: 0,
				 [e.target.name]: e.target.value
			}))
		},
		[]
	)

    return (
        <div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AppliedFiltersChips filters={filters} removeFilter={removeFilterCallback} resetFilters={resetFiltersCallback}/>
                <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setOpen(true)}
                >
                    Filters
                </Button>
            </Box>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
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
                                value={values.destinationChain}
                                onChange={changeCallback}
                            >
								{Object.values(ChainEnum).map(chain => (
									<MenuItem key={chain} value={chain}>{chain}</MenuItem>
								))}
                            </Select>
                        </FormControl>
                        <TextField
                            id="receiver-address"
                            name={propertyOf<BridgeTransactionFilterDto>('receiverAddress')}
                            label="Receiver Address"
                            variant="outlined"
                            size="small"
                            value={values.receiverAddress}
                            onChange={changeCallback}
                        />
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    id="amount-from"
                                    name={propertyOf<BridgeTransactionFilterDto>('amountFrom')}
                                    label="Amount From"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={values.amountFrom}
                                    onChange={changeCallback}
                                />
                                <TextField
                                    id="amount-to"
                                    name={propertyOf<BridgeTransactionFilterDto>('amountTo')}
                                    label="Amount To"
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={values.amountTo}
                                    onChange={changeCallback}
                                />
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant="contained" color="primary" onClick={applyFiltersCallback}>
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </div>
    );
}