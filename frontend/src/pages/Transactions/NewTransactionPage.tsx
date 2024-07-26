import { Button, Card, CardContent, CardHeader, LinearProgress, MenuItem, Select, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";
import BasePage from '../base/BasePage';
import TextFormField from '../../components/Form/TextFormField';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChainEnum, CreateTransactionDto, CreateTransactionReceiverDto } from '../../swagger/apexBridgeApiService';
import { createTransactionAction } from './action';
import FieldBase from '../../components/Form/FieldBase';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import appSettings from '../../settings/appSettings';
import { capitalizeWord } from '../../utils/generalUtils';
import { HOME_ROUTE } from '../PageRouter';
import { signAndSubmitTx } from '../../actions/submitTx';
import { RootState } from '../../redux/store';
import { toast } from 'react-toastify';

const chainOptions = [
	ChainEnum.Prime,
	ChainEnum.Vector
]

// TODO: add input validations
function NewTransactionPage() {
	const originChain = useSelector((state: RootState) => state.chain.chain);
	const accountInfo = useSelector((state: RootState) => state.wallet.accountInfo);
	const destinationChain = originChain === ChainEnum.Prime ? ChainEnum.Vector : ChainEnum.Prime;

	const [values, setValues] = useState(new CreateTransactionDto({
		originChain,
		senderAddress: accountInfo?.account || '',
		destinationChain,
		receivers: [],
		bridgingFee: undefined,
	}));

	useEffect(() => {
		setValues((state) => new CreateTransactionDto({ ...state, originChain, senderAddress: accountInfo?.account || '' }))
	}, [originChain, accountInfo?.account])

	const chainOptionsMemo = useMemo(() => chainOptions.filter(x => x !== originChain), [originChain])

	const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

	const dispatch = useDispatch();

	const fetchFunction = useTryCatchJsonByAction();

	const handleSubmitCallback = useCallback(
		async () => {
			if (values.receivers.length === 0 ||
				values.receivers.some(x => x.amount < appSettings.minUtxoValue)) {
				toast.error(`Amount less than minimum: ${appSettings.minUtxoValue}`);
				return;
			}

			if (values.receivers.some(x => !x.address)) {
				toast.error(`Enter destination address`);
				return;
			}

			setLoading(true);
			try {
				const bindedCreateAction = createTransactionAction.bind(null, new CreateTransactionDto(values));
				const createResponse = await fetchFunction(bindedCreateAction);
				if ((createResponse as any).err) {
					throw new Error((createResponse as any).err)
				}

				const success = await signAndSubmitTx(
					values,
					createResponse,
					dispatch,
				);

				success && navigate(HOME_ROUTE, { replace: true });
			}catch(err) {
				console.log(err);
				toast.error(`${err}`)
			} finally {
				setLoading(false);
			}
		},
		[dispatch, navigate, fetchFunction, values]
	)

	const receiver = values.receivers && values.receivers.length > 0 ? values.receivers[0] : undefined
	
	return (
		<BasePage>
			<>
				<Card variant="outlined" sx={{ width: '1200px', maxWidth: '75%', margin: '5px' }}>
					<CardHeader title="Source" sx={{ padding: '16px 16px 0px 16px' }} />
					<CardContent sx={{ padding: '0px 16px 16px 16px' }}>
						<TextFormField label='Address' disabled value={values.senderAddress} />
						<TextFormField label='Chain' disabled value={capitalizeWord(values.originChain)} />
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
