import { Button, Dialog, DialogTitle, FormControl, LinearProgress, MenuItem, Select } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE }  from '../PageRouter';
import { useDispatch } from 'react-redux';
import { ChainEnum, GenerateLoginCodeDto } from '../../swagger/apexBridgeApiService';
import { PKLoginDto } from '../../utils/storageUtils';
import TextFormField from '../../components/Form/TextFormField';
import FieldBase from '../../components/Form/FieldBase';
import { capitalizeWord } from '../../utils/generalUtils';
import { setPKLoginAction } from '../../redux/slices/pkLoginSlice';

// TODO: add input validations
function PKLoginPage() {
	const [connecting, setConnecting] = useState(false);
	const dispatch = useDispatch();

	const [values, setValues] = useState(new GenerateLoginCodeDto({
		chainId: ChainEnum.Prime,
		address: '',
	}));

	const [pkLoginValues, setPKLoginValues] = useState<PKLoginDto>({
		address:  '',
		privateKey: '',
	});
	
	const navigate = useNavigate();

	async function handleLogin() {
		setConnecting(true);

		try {
			dispatch(setPKLoginAction(pkLoginValues));
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
								address: '',
							}))
							setPKLoginValues((state) => ({
								...state,
								address: '',
								privateKey: '',
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
					onValueChange={(event) => {
						setValues((state) => new GenerateLoginCodeDto({
							...state,
							address: event.target.value
						}))
						setPKLoginValues((state) => ({
							...state,
							address: event.target.value
						}))
					}}
				/>	
				<TextFormField
					label='Private key'
					value={pkLoginValues.privateKey}
					onValueChange={(event) => {
						setPKLoginValues((state) => ({
							...state,
							privateKey: event.target.value
						}))
					}}
				/>
				<Button
					style={{margin: '10px'}}
					onClick={handleLogin}
					disabled={connecting || !pkLoginValues.address || !pkLoginValues.privateKey}
				>
					Login
				</Button>
			</FormControl>
			{connecting && <LinearProgress />}
		</Dialog>
	);
}

export default PKLoginPage;
