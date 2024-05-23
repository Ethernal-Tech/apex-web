import { Button, Dialog, DialogTitle, FormControl, LinearProgress, MenuItem, Select } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE }  from '../PageRouter';
import { useDispatch } from 'react-redux';
import { setTokenAction } from '../../redux/slices/tokenSlice';
import { generateLoginCodeAction, loginAction } from './action';
import { ChainEnum, DataSignatureDto, GenerateLoginCodeDto, LoginDto } from '../../swagger/apexBridgeApiService';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import appSettings from '../../settings/appSettings';
import TextFormField from '../../components/Form/TextFormField';
import FieldBase from '../../components/Form/FieldBase';
import { capitalizeWord } from '../../utils/generalUtils';

// TODO: add input validations
function PKLoginPage() {
	const [connecting, setConnecting] = useState(false);
	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();

	const [values, setValues] = useState(new GenerateLoginCodeDto({
		chainId: ChainEnum.Prime,
		address: appSettings.primeAddress,
	}));
	
	const privateKey = values.chainId === ChainEnum.Prime ? appSettings.primePrivateKey : appSettings.vectorPrivateKey;
	
	const navigate = useNavigate();

	async function handleLogin() {
		setConnecting(true);

		try {
			const bindedGenerateLoginCodeAction = generateLoginCodeAction.bind(null, new GenerateLoginCodeDto(values));
			const loginCode = await fetchFunction(bindedGenerateLoginCodeAction);
			if (!loginCode) {
				setConnecting(false);
				return;
			}

			// TODO: sign data with private key?
			const messageHex = Buffer.from(loginCode.code).toString("hex");

			const signedData = {key: '', signature: ''}
			const loginModel = new LoginDto({
				...values,
				signedLoginCode: new DataSignatureDto(signedData),
			});
				
			const bindedLoginAction = loginAction.bind(null, loginModel);
			const token = await fetchFunction(bindedLoginAction);
			setConnecting(false);

			if (!token) {
				return;
			}

			dispatch(setTokenAction(token));
			return navigate(HOME_ROUTE);

		}
		catch (err: any) {
			if (err instanceof Error) {
				console.log(err.stack)
			}
			setConnecting(false);
		}

	}
	return (
		<Dialog open fullWidth>
			<DialogTitle>Please login</DialogTitle>
			<FormControl>
				<FieldBase label='Chain'>
					<Select
						value={values.chainId}
						onChange={(event) => {
								setValues((state) => new GenerateLoginCodeDto({
								...state,
								chainId: event.target.value as ChainEnum,
								address: event.target.value as ChainEnum === ChainEnum.Prime
									? appSettings.primeAddress : appSettings.vectorAddress
							}))
						}}
						>
						<MenuItem value={ChainEnum.Prime}>{capitalizeWord(ChainEnum.Prime)}</MenuItem>
						<MenuItem value={ChainEnum.Vector}>{capitalizeWord(ChainEnum.Vector)}</MenuItem>
					</Select>
				</FieldBase>
				<TextFormField
					label='Address'
					value={values.address}
					disabled
				/>	
				<TextFormField
					label='Private key'
					value={privateKey}
					disabled
				/>
				<Button style={{margin: '10px'}} onClick={handleLogin} disabled={connecting}>
					Login
				</Button>
			</FormControl>
			{connecting && <LinearProgress />}
		</Dialog>
	);
}

export default PKLoginPage;
