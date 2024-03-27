import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FieldBase from "../components/Form/FieldBase";
import { requestBridgingAction } from "../actions/bridging";
import { Box, Button, Card, CardContent, CardHeader, CircularProgress, Container, MenuItem, Select, Typography } from "@mui/material";
import TextFormField from "../components/Form/TextFormField";
import InfoFormField from "../components/Form/InfoFormField";
import { requestAddressBalanceAction, requestBridgeBalanceAction } from "../actions/balance";
import { BridgingRequestState, Chain } from "../features/enums";
import BridgingRequestHandler, { BridgingHandlerNotification } from "../features/BridgingRequestHandler";

const FIELDS = {
    PRIVATE_KEY: 'privateKey',
    SOURCE_ADDR: 'sourceAddress',
    AMOUNT: 'amount',
    DESTINATION_ADDR: 'destinationAddress',
}

const MINIMUM_AMOUNT_TO_SEND = 849070
const CAN_NOT_BE_EMPTY_ERROR = 'Can not be empty'
const CAN_NOT_BE_ZERO_OR_NEGATIVE_ERROR = 'Can not be zero or negative'
const LESS_THAN_MINIMUM_AMOUNT = `Must be greater or equal to the minimum amount to send: ${MINIMUM_AMOUNT_TO_SEND}`

const initialSourceChain = Chain.PRIME

const BridgingRequestStatusMessage = {
    [BridgingRequestState.RequestedOnSource]: '33% Bridging requested on source',
    [BridgingRequestState.RequestedOnDestination]: '67% Bridging requested on destination',
    [BridgingRequestState.Finished]: '100% Bridging finished!',
    [BridgingRequestState.Error]: 'An error occurred!',
}

function PrivateKeyForm() {
    const [privateKey, setPrivateKey] = useState('');
    const [sourceAddress, setSourceAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [sourceChain, setSourceChain] = useState<Chain>(initialSourceChain);
    const [destinationAddress, setDestinationAddress] = useState('');
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [requestStatus, setRequestStatus] = useState<BridgingRequestState | undefined>();

    const [sourceAddressBalance, setSourceAddressBalance] = useState<number | undefined>();
    const [sourceBridgeBalance, setSourceBridgeBalance] = useState<number | undefined>();
    const [destinationAddressBalance, setDestinationAddressBalance] = useState<number | undefined>();
    const [destinationBridgeBalance, setDestinationBridgeBalance] = useState<number | undefined>();
    const bridgingRequest = useRef<BridgingRequestHandler | undefined>();

    const destinationChain = useMemo(() => sourceChain === Chain.PRIME ? Chain.VECTOR : Chain.PRIME, [sourceChain]);

    const onBridgingRequestHandlerNotification = useCallback((notificationObj: BridgingHandlerNotification) => {
        const {
            sourceAddrBalance,
            sourceBridgeBalance,
            destinationAddrBalance,
            destinationBridgeBalance,
            status,
        } = notificationObj;
        
        setSourceAddressBalance(sourceAddrBalance);
        setSourceBridgeBalance(sourceBridgeBalance);
        setDestinationAddressBalance(destinationAddrBalance);
        setDestinationBridgeBalance(destinationBridgeBalance);
        setRequestStatus(status);
    }, []);

    const fetchBridgeBalances = useCallback(async () => {
        const sourceBridgeBalance = await requestBridgeBalanceAction({
            chainId: sourceChain,
        });

        const destinationBridgeBalance = await requestBridgeBalanceAction({
            chainId: sourceChain === Chain.PRIME ? Chain.VECTOR : Chain.PRIME,
        });

        setSourceBridgeBalance(sourceBridgeBalance);
        setDestinationBridgeBalance(destinationBridgeBalance);
    }, [sourceChain]);

    useEffect(() => {
        fetchBridgeBalances();
    }, [fetchBridgeBalances]);

    const fetchSourceAddressBalance = useCallback(async () => {
        if (sourceAddress) {
            const sourceAddrBalance = await requestAddressBalanceAction({
                chainId: sourceChain,
                address: sourceAddress,
            });

            setSourceAddressBalance(sourceAddrBalance);
        }
        else {
            setSourceAddressBalance(undefined);
        }
    }, [sourceAddress, sourceChain]);

    useEffect(() => {
        fetchSourceAddressBalance();
    }, [fetchSourceAddressBalance]);

    const fetchDestinationAddressBalance = useCallback(async () => {
        if (destinationAddress) {
            const destinationAddrBalance = await requestAddressBalanceAction({
                chainId: destinationChain,
                address: destinationAddress,
            });

            setDestinationAddressBalance(destinationAddrBalance);
        }
        else {
            setDestinationAddressBalance(undefined);
        }
    }, [destinationAddress, destinationChain]);

    useEffect(() => {
        fetchDestinationAddressBalance();
    }, [fetchDestinationAddressBalance]);

    const resetBridgingRequest = useCallback(() => {
        bridgingRequest.current = undefined;
        setRequestStatus(undefined);
    }, []);

    const clearFieldError = useCallback((field: string) => {
        setErrors(prev => {
            let newErrors = {...prev};
            delete newErrors[field];
            return newErrors;
        });
    }, []);

    const onPrivateKeyChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPrivateKey(e.target.value);
        clearFieldError(FIELDS.PRIVATE_KEY);
        resetBridgingRequest();
    }, [clearFieldError, resetBridgingRequest]);

    const onSourceAddressChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSourceAddress(e.target.value);
        clearFieldError(FIELDS.SOURCE_ADDR);
        resetBridgingRequest();
    }, [clearFieldError, resetBridgingRequest]);

    const onAmountChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValueStr = e.target.value.replace(/[^\d]/g, '').replace(/^0+(0$|[1-9])/mg, '$1');
        setAmount(newValueStr);
        clearFieldError(FIELDS.AMOUNT);
        resetBridgingRequest();
    }, [clearFieldError, resetBridgingRequest]);

    const onDestinationAddressChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setDestinationAddress(e.target.value);
        clearFieldError(FIELDS.DESTINATION_ADDR);
        resetBridgingRequest();
    }, [clearFieldError, resetBridgingRequest]);

    const onSourceChainChanged = useCallback((e: any) => {
        setSourceChain(e.target.value as Chain);

        setSourceBridgeBalance(undefined);
        setDestinationBridgeBalance(undefined);
        resetBridgingRequest();
    }, [resetBridgingRequest]);

    const validateInputs = useCallback(() => {
        let errors: {[key: string]: string} = {};
        if (!privateKey) {
            errors[FIELDS.PRIVATE_KEY] = CAN_NOT_BE_EMPTY_ERROR;
        }

        if (!sourceAddress) {
            errors[FIELDS.SOURCE_ADDR] = CAN_NOT_BE_EMPTY_ERROR;
        }

        if (!amount) {
            errors[FIELDS.AMOUNT] = CAN_NOT_BE_EMPTY_ERROR;
        }
        else if (parseInt(amount) <= 0) {
            errors[FIELDS.AMOUNT] = CAN_NOT_BE_ZERO_OR_NEGATIVE_ERROR;
        }
        else if (parseInt(amount) < MINIMUM_AMOUNT_TO_SEND) {
            errors[FIELDS.AMOUNT] = LESS_THAN_MINIMUM_AMOUNT;
        }

        if (!destinationAddress) {
            errors[FIELDS.DESTINATION_ADDR] = CAN_NOT_BE_EMPTY_ERROR;
        }

        setErrors(errors);

        const hasErrors = Object.keys(errors).length > 0;
        return hasErrors;
    }, [amount, destinationAddress, privateKey, sourceAddress]);

    const onSend = useCallback(async () => {
        resetBridgingRequest();

        const hasErrors = validateInputs();
        if (hasErrors) {
            return;
        }

        const requestModel = {
            priv_key: privateKey,
            sender_address: sourceAddress,
            amount: parseInt(amount),
            chainId: sourceChain,
            recv_address: destinationAddress,
        }

        console.log('request model: ', requestModel);

        const response = await requestBridgingAction(requestModel);

        console.log('response: ', response);

        if (response?.message) {
            setRequestStatus(BridgingRequestState.RequestedOnSource);
            bridgingRequest.current = new BridgingRequestHandler(
                sourceChain,
                sourceAddress,
                sourceAddressBalance,
                sourceBridgeBalance,
                destinationAddress,
                destinationAddressBalance,
                destinationBridgeBalance,
                onBridgingRequestHandlerNotification,
            );
        }
        else {
            setRequestStatus(BridgingRequestState.Error);
        }
    }, [amount, destinationAddress, destinationAddressBalance, destinationBridgeBalance, onBridgingRequestHandlerNotification, privateKey, resetBridgingRequest, sourceAddress, sourceAddressBalance, sourceBridgeBalance, sourceChain, validateInputs]);

    const hasErrors = Object.keys(errors).length > 0 || !privateKey || !sourceAddress || !amount || !destinationAddress;
    const inputsDisabled = useMemo(() => requestStatus !== undefined && requestStatus !== BridgingRequestState.Finished && requestStatus !== BridgingRequestState.Error, [requestStatus])

    return (
        <Box sx={{ margin: '20px', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
            <Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%' }}>
                <CardHeader title="Source" sx={{ padding: '16px 16px 0px 16px' }}/>
                <CardContent sx={{ padding: '0px 16px 16px 16px' }}>
                    <TextFormField label={'Private key'} error={errors[FIELDS.PRIVATE_KEY]} value={privateKey} onValueChange={onPrivateKeyChanged} disabled={inputsDisabled}/>
                    <TextFormField label={'Address'} error={errors[FIELDS.SOURCE_ADDR]} value={sourceAddress} onValueChange={onSourceAddressChanged} disabled={inputsDisabled}/>
                    {
                        sourceAddressBalance !== undefined &&
                        <Container sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '5px' }}>
                            <Typography>Balance: {sourceAddressBalance}</Typography>
                        </Container>
                    }
                    <TextFormField label={'Amount'} error={errors[FIELDS.AMOUNT]} value={amount} onValueChange={onAmountChanged} disabled={inputsDisabled}/>
                    <InfoFormField label={'Asset'} value={'APX'} />
                    <FieldBase label={'Source chain'}>
                        <Select
                            disabled={inputsDisabled}
                            value={sourceChain} onChange={onSourceChainChanged}
                            SelectDisplayProps={{
                                style: { padding: '12px 14px' }
                            }}
                        >
                            <MenuItem value={Chain.PRIME}>{Chain.PRIME}</MenuItem>
                            <MenuItem value={Chain.VECTOR}>{Chain.VECTOR}</MenuItem>
                        </Select>
                    </FieldBase>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%', marginTop: '20px' }}>
                <CardHeader title="Destination" sx={{ padding: '16px 16px 0px 16px' }}/>
                <CardContent sx={{ padding: '0px 16px 16px 16px' }}>
                    <InfoFormField label={''} value={destinationChain} />
                    <TextFormField label={'Address'} error={errors[FIELDS.DESTINATION_ADDR]} value={destinationAddress} onValueChange={onDestinationAddressChanged} disabled={inputsDisabled}/>
                    {
                        destinationAddressBalance !== undefined &&
                        <Container sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '5px' }}>
                            <Typography>Balance: {destinationAddressBalance}</Typography>
                        </Container>
                    }
                </CardContent>
            </Card>

            <Box sx={{ width: '1200px', maxWidth: '75%', marginTop: '10px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Button sx={{ width: '150px', fontSize: 'large' }} variant="contained" onClick={onSend}
                    disabled={hasErrors || inputsDisabled}
                >
                    {inputsDisabled && <CircularProgress size={26} color="inherit" sx={{ marginRight: '16px' }} />}
                    Send
                </Button>
                {
                    !!requestStatus &&
                    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'flex-end', marginLeft: '10px' }}>
                        <Typography>Status: {BridgingRequestStatusMessage[requestStatus]}</Typography>
                    </Box>
                }
            </Box>
        </Box>
    );
}

export default PrivateKeyForm;