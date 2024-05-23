import { Button, Card, CardContent, CardHeader, LinearProgress, MenuItem, Select, Typography } from '@mui/material';
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
import { HOME_ROUTE } from '../PageRouter';
import { signAndSubmitTx } from '../../actions/submitTx';

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
					tokenState.token?.chainId,
					values,
					createResponse,
					dispatch,
				);

				navigate(HOME_ROUTE, { replace: true });
			}catch(err) {
				console.log(err);
			} finally {
				setLoading(false);
			}
		},
		[tokenState.token?.chainId, dispatch, navigate, fetchFunction, values]
	)

	const receiver = values.receivers && values.receivers.length > 0 ? values.receivers[0] : undefined
	
	return (
		<BasePage>
			<>
				<Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%', margin: '5px' }}>
					<CardHeader title="Source" sx={{ padding: '16px 16px 0px 16px' }} />
					<CardContent sx={{ padding: '0px 16px 16px 16px' }}>
						<TextFormField label='Address' disabled value={tokenState.token!.address} />
						<TextFormField label='Chain' disabled value={capitalizeWord(tokenState.token!.chainId)} />
					</CardContent>
				</Card>
				<Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%' }}>
					<CardHeader title="Destination" sx={{ padding: '16px 16px 0px 16px' }} />
					<CardContent sx={{ padding: '0px 16px 16px 16px' }}>
						<FieldBase label='Chain'>
							<Select
								value={values.destinationChain}
								onChange={(event) => setValues((state) => new CreateTransactionDto({...state, destinationChain: event.target.value as ChainEnum}))}
							>
								{chainOptionsMemo.map(option => (
									<MenuItem key={option} value={option}>{capitalizeWord(option)}</MenuItem>
								))}
							</Select>
						</FieldBase>
						{
							appSettings.bridgingFee &&
							<FieldBase label='Bridging fee'>
								<Typography variant="body1">{appSettings.bridgingFee}</Typography>
							</FieldBase>
						}
					</CardContent>
				</Card>
				<Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%', margin: '5px' }}>
					<CardContent sx={{ padding: '0px 16px 16px 16px' }}>
						<TextFormField
							label='Address'
							value={receiver?.address || ""}
							onValueChange={(event) => setValues(
								(state) =>
								new CreateTransactionDto({
									...state,
									receivers: [new CreateTransactionReceiverDto({
										address: event.target.value,
										amount: receiver?.amount || 0,
									})]
								})
							)}
						/>
						{/* TODO: use number input */}
						<TextFormField
							label='Amount' value={receiver?.amount || 0}
							onValueChange={
								(event) => setValues(
									(state) => new CreateTransactionDto({
										...state,
										receivers: [new CreateTransactionReceiverDto({
											address: receiver?.address || "",
											amount: parseFloat(event.target.value),
										})]
									})
								)
							} />
						<Button style={{margin: '30px 10px 5px 15px'}} variant='outlined' onClick={handleSubmitCallback} disabled={loading}>
							Send
						</Button>
						{loading && <LinearProgress />}
					</CardContent>
				</Card>
			</>
		</BasePage>
	)
}

export default NewTransactionPage;
