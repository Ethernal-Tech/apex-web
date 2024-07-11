import { Box, Button, Card, CardContent, CardHeader, LinearProgress, MenuItem, Select, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";
import BasePage from '../base/BasePage';
import TextFormField from '../../components/Form/TextFormField';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useCallback, useMemo, useState } from 'react';
import { ChainEnum, CreateTransactionDto, CreateTransactionReceiverDto } from '../../swagger/apexBridgeApiService';
import { createTransactionAction } from './action';
import FieldBase from '../../components/Form/FieldBase';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import appSettings from '../../settings/appSettings';
import { capitalizeWord } from '../../utils/generalUtils';
import { TRANSACTIONS_ROUTE } from '../PageRouter';
import { signAndSubmitTx } from '../../actions/submitTx';
import AddressBalance from './components/AddressBalance';

const chainOptions = [
	ChainEnum.Prime,
	ChainEnum.Vector
]

// TODO: add input validations
function NewTransactionPage() {
	const tokenState = useSelector((state: RootState) => state.token);
	const chainOptionsMemo = useMemo(
		() => chainOptions.filter(item => item !== tokenState.token!.chainId),
		[tokenState]
	);

	const [values, setValues] = useState(new CreateTransactionDto({
		destinationChain: chainOptionsMemo[0],
		receivers: [],
		bridgingFee: undefined,
	}));

	const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

	const dispatch = useDispatch();

	const fetchFunction = useTryCatchJsonByAction();

	const handleSubmitCallback = useCallback(
		async () => {
			setLoading(true);
			try {
				const bindedCreateAction = createTransactionAction.bind(null, new CreateTransactionDto(values));
				const createResponse = await fetchFunction(bindedCreateAction);

				await signAndSubmitTx(
					values,
					createResponse,
					dispatch,
				);

				navigate(TRANSACTIONS_ROUTE, { replace: true });
			}catch(err) {
				console.log(err);
			} finally {
				setLoading(false);
			}
		},
		[dispatch, navigate, fetchFunction, values]
	)

	const receiver = values.receivers && values.receivers.length > 0 ? values.receivers[0] : undefined
	
	return (
		<BasePage>
			<AddressBalance/>
		</BasePage>
	)
}

export default NewTransactionPage;
