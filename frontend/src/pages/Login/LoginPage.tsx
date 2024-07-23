import { Button, Dialog, DialogTitle, FormControl, LinearProgress, MenuItem, Select } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE }  from '../PageRouter';
import { useDispatch, useSelector } from 'react-redux';
import walletHandler, { Wallet } from '../../features/WalletHandler';
import { login } from '../../actions/login';
import FieldBase from '../../components/Form/FieldBase';
import { ChainEnum } from '../../swagger/apexBridgeApiService';
import { setChainAction } from '../../redux/slices/chainSlice';
import { capitalizeWord } from '../../utils/generalUtils';
import { RootState } from '../../redux/store';

function LoginPage() {
	const [connecting, setConnecting] = useState(false);
	const dispatch = useDispatch();

	const chain = useSelector((state: RootState) => state.chain.chain)
	
	const navigate = useNavigate();

	const installedWallets = useMemo(
		() => walletHandler.getInstalledWallets(),
		[]
	)

	const [wallet, setWallet] = useState<string | undefined>(
		installedWallets.length > 0 ? installedWallets[0].name : undefined,
	);

	const handleLogin = useCallback(async() => {
		if (!wallet) {
			return;
		}

		setConnecting(true);
		const success = await login(wallet, chain, dispatch);
		setConnecting(false);

		if (success) {
			dispatch(setChainAction(chain))
			navigate(HOME_ROUTE);
		}
	}, [chain, dispatch, navigate, wallet])

	return (
		
		<Dialog open fullWidth>
			<DialogTitle>Please login</DialogTitle>
			<FormControl>
				<FieldBase label='Chain'>
					<Select
						// disabled={connecting}
						disabled={true} // always disabled as users select the network on the homepage
						value={chain}
						onChange={(event) => {
							dispatch(setChainAction(event.target.value as ChainEnum))
						}}
						>
						{
							Object.values(ChainEnum).map(x => (
								<MenuItem key={`chain_opt_${x}`} value={x}>{capitalizeWord(x)}</MenuItem>
							))
						}
					</Select>
				</FieldBase>
				<FieldBase label='Wallet'>
					<Select
						value={wallet}
						disabled={connecting}
						onChange={(event) => setWallet(event.target.value as string)}
						>
						{
							installedWallets.map((wallet: Wallet) => (
								<MenuItem key={`wallet_opt_${wallet.name}`} value={wallet.name}>
									<div style={{
										display: 'flex',
										flexDirection: 'row',
										justifyContent: 'flex-start',
										alignItems: 'center',
									}}>
										<img src={wallet.icon} alt={wallet.name} height={40} width={40} />
										<div style={{ marginLeft: 10 }}>
											{wallet.name}
										</div>
									</div>
								</MenuItem>
							))
						}
					</Select>
				</FieldBase>
				<Button
					style={{margin: '10px'}}
					onClick={handleLogin}
					disabled={connecting || !wallet}
				>
					Login
				</Button>
			</FormControl>
			{connecting && <LinearProgress />}
		</Dialog>
	);
}

export default LoginPage;
