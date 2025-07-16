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
import styled from '@emotion/styled';

const StyledFormControl = styled(FormControl)({
    '& .MuiSelect-select': {
        backgroundColor: '#1a2e3b',
        borderColor: '#1a2e3b',
        color:'white',
    },
    '& .MuiSvgIcon-root':{
        color:'white'
    },

    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#1a2e3b',
    },
})

const CustomMenuItem = styled(MenuItem)({
    backgroundColor: '#1a2e3b',
    color: '#ffffff',
    '&:hover': {
        backgroundColor: '#2b4a5a',
    },
});

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

const receiverAddressStyle = {
'& .MuiOutlinedInput-root': {
    '& fieldset': {
        borderColor: '#435F69',
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
        'webkitAppearance': 'none',
        '&[type=number]': {
            'mozAppearance': 'textfield', // Firefox
        },
    }
};

const amountStyle = {
'& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    '& fieldset': {
        borderColor: '#435F69',
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
    'webkitAppearance': 'none',
    '&[type=number]': {
        'mozAppearance': 'textfield', // Firefox
    },
}
}

type Props = {
    filters: BridgeTransactionFilterDto
    onFilterChange: (newFilters: BridgeTransactionFilterDto) => void
}

export default function Filters({ filters, onFilterChange }: Props) {
    const [values, setValues] = useState(new BridgeTransactionFilterDto(filters));
    const [open, setOpen] = useState(false);

    const chain = useSelector((state: RootState) => state.chain.chain)
    const account = useSelector((state: RootState) => state.accountInfo.account);

    const enabledChains = useSelector((state: RootState) => state.settings.enabledChains);
    const destinationChains = useMemo(
        () => Object.values(ChainEnum).filter(x => x !== chain && enabledChains.includes(x)),
        [chain, enabledChains],
    )

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
                senderAddress: account,
                order: filters.order,
                orderBy: filters.orderBy,
            }))
        },
        [onFilterChange, chain, account, filters.order, filters.orderBy]
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

    const handlePasteReceiverAddress = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setValues((state) => new BridgeTransactionFilterDto({
                ...state,
                receiverAddress: text
            }));
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    }

    return (
        <>
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
                        <StyledFormControl sx={{ minWidth: 220 }} variant="outlined" size='small'>
                            <Select
                                id="destination-chain"
                                labelId='destination-chain-label'
                                name='destinationChain'
                                variant="outlined"
                                value={values.destinationChain}
                                onChange={changeCallback}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            bgcolor: '#1a2e3b',
                                            '& .MuiMenuItem-root': {
                                                color: '#ffffff',
                                            },
                                        },
                                    },
                                }}
                            >
                                {destinationChains.map(chain => (
                                    <CustomMenuItem key={chain} value={chain}>{capitalizeWord(chain)}</CustomMenuItem>
                                ))}
                            </Select>
                        </StyledFormControl>

                        <InputLabel sx={{color:'white'}} id="receiver-address">Receiver Address</InputLabel>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position:'relative' }}>
                            <TextField
                                id="receiver-address"
                                name="receiverAddress"
                                variant="outlined"
                                size="small"
                                value={values.receiverAddress}
                                onChange={changeCallback}
                                sx={{
                                    width:'100%',
                                    ...receiverAddressStyle
                                }}
                            />
                            {!values.receiverAddress &&
                            <Button
                                variant="text"
                                onClick={handlePasteReceiverAddress}
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
                            }
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
                                    sx={amountStyle}
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
                                    sx={amountStyle}
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
        </>
    );
}
