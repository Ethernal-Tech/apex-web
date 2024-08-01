import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import FilterList from '@mui/icons-material/FilterList';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import AppliedFiltersChips from './AppliedFiltersChips';
import { BridgeTransactionFilterDto, ChainEnum, TransactionStatusEnum } from '../../swagger/apexBridgeApiService';
import { capitalizeWord } from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: '#052531',
    boxShadow: 24,
    p: 4,
    color: 'white',
    width: '400px',
    border: '1px solid #435F69',
    borderRadius: '4px',
};

type Props = {
    filters: BridgeTransactionFilterDto
    onFilterChange: (newFilters: BridgeTransactionFilterDto) => void
}

export default function Filters({ filters, onFilterChange }: Props) {
    const [values, setValues] = useState(new BridgeTransactionFilterDto(filters));
    const [open, setOpen] = useState(false);

    const chain = useSelector((state: RootState) => state.chain.chain)
    const accountInfoState = useSelector((state: RootState) => state.accountInfo);

    const destinationChains = useMemo(() => Object.values(ChainEnum).filter(x => x !== chain), [chain])

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
                originChain: chain,
                senderAddress: accountInfoState.account,
                order: filters.order,
                orderBy: filters.orderBy,
            }))
        },
        [onFilterChange, chain, accountInfoState.account, filters.order, filters.orderBy]
    )

    const changeCallback = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<TransactionStatusEnum> | SelectChangeEvent<ChainEnum>) => {
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <AppliedFiltersChips filters={filters} removeFilter={removeFilterCallback} resetFilters={resetFiltersCallback} />
                <Button
                    variant="outlined"
                    onClick={() => setOpen(true)}
                    sx={{
                        color: 'white',
                        borderColor: 'white',
                        minWidth: 'unset',
                        padding: '5px',
                        borderRadius: '100px',
                        '&:hover': {
                            borderColor: '#a6a6a6',
                            color: '#a6a6a6'
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
                        <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>Filter</Typography>

                        <InputLabel sx={{color:'white'}} id="destination-chain-label">Destination Chain</InputLabel>
                        <FormControl sx={{ minWidth: 220 }} variant="outlined" size='small'>
                            <Select
                                id="destination-chain"
                                labelId='destination-chain-label'
                                name='destinationChain'
                                variant="outlined"
                                value={values.destinationChain}
                                onChange={changeCallback}
                                sx={{
                                    '& .MuiSelect-select': {
                                        backgroundColor: '#1a2e3b',
                                        borderColor: '#1a2e3b',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#1a2e3b',
                                    },
                                }}
                            >
                                {destinationChains.map(chain => (
                                    <MenuItem key={chain} value={chain}>{capitalizeWord(chain)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <InputLabel sx={{color:'white'}} id="receiver-address">Receiver Address</InputLabel>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position:'relative' }}>
                            <TextField
                                id="receiver-address"
                                name="receiverAddress"
                                variant="outlined"
                                size="small"
                                // value={values.receiverAddress} // TODO - implement receiverAddress as a filter
                                onChange={changeCallback}
                                sx={{
                                    width:'100%',
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#1a2e3b',
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#1a2e3b',
                                    },
                                }}
                            />
                            <Button
                                variant="text"
                                sx={{
                                    color: '#F27B50',
                                    backgroundColor: 'transparent',
                                    position:'absolute',
                                    top:'50%',
                                    transform: 'translateY(-50%)',
                                    right:0,
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                        color:'#ed8a66'
                                    },
                                }}
                            >
                                PASTE
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box>
                                <Typography>Amount From</Typography>
                                <TextField
                                    id="amount-from"
                                    name='amountFrom'
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={values.amountFrom}
                                    onChange={changeCallback}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#1a2e3b',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#1a2e3b',
                                        },
                                    }}
                                />
                            </Box>
                            <Box>
                            <Typography>Amount To</Typography>
                                <TextField
                                    id="amount-to"
                                    name='amountTo'
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={values.amountTo}
                                    onChange={changeCallback}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#1a2e3b',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#1a2e3b',
                                        },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                            onClick={() => setOpen(false)}
                            sx={{
                                color: 'white',
                                borderColor: '#f0a500',
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
        </div>
    );
}
