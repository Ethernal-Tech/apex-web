import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { BrowserWallet, Wallet } from '@meshsdk/core';
import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import WalletErrorMessage from './WalletErrorMessage';
import { WalletErrors } from '../../features/enums';
import { TABLE_ROUTE } from '../PageRouter';
import { useDispatch } from 'react-redux';
import { setIsLoggedInSliceAction } from '../../redux/slices/isLoggedInSlice';

function LoginPage() {
	const [installedWallets, setInstalledWallets] = useState<Wallet[] | undefined>();
	const [showNoWalletMessage, setShowNoWalletMessage] = useState<WalletErrors | undefined>();

	const dispatch = useDispatch();
	
	const navigate = useNavigate();

	useEffect(() => {
		async function getInstalledWallets() {
			const installedWallets = BrowserWallet.getInstalledWallets();
			if (!installedWallets.length) { return setShowNoWalletMessage(WalletErrors.NoWalletsAvailable); }
			setInstalledWallets(installedWallets);
		}
		getInstalledWallets();
	}, [])

	async function handleWalletClick(event: any) {
		const { id: walletName } = event.target;
		if (!walletName) return;

		try {
			const wallet = await BrowserWallet.enable(walletName);
			if (wallet instanceof BrowserWallet)  {
				// TODO: login to web api, and handle login correctly
				dispatch(setIsLoggedInSliceAction(true));
				return navigate(TABLE_ROUTE);
			}
		} catch (error) {
			setShowNoWalletMessage(WalletErrors.WalletNotEnabled);
		}

	}
	return (
		<>
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
			{showNoWalletMessage ?
				<WalletErrorMessage type={showNoWalletMessage} onClose={() => setShowNoWalletMessage(undefined)} /> :
				<Box sx={{ mt: 2 }}>
					<FormControl fullWidth>
						<InputLabel id="wallet-select-label" sx={{backgroundColor: 'white'}}>Select wallet</InputLabel>
						<Select
							sx={{ width: '300px' }}
							labelId="wallet-select-label"
							id="wallet-select"
							value=""
							onClick={(e) => handleWalletClick(e)}
						>
							{installedWallets?.map(wallet => (
								<MenuItem key={wallet.name} value={wallet.name} id={wallet.name}>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<img src={wallet.icon} alt={wallet.name} height={20} width={20} />
										{wallet.name}
									</Box>
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			}
		</Box>
		</>
	);
}


export default LoginPage;
