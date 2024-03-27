import { Box, CssBaseline, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { BrowserWallet, Wallet } from '@meshsdk/core';
import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import WalletErrorMessage from './containers/WalletErrorMessage';
import { WalletErrors } from './features/enums';

function App() {
	const [installedWallets, setInstalledWallets] = useState<Wallet[] | undefined>();
	const [showNoWalletMessage, setShowNoWalletMessage] = useState<WalletErrors | undefined>();

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
			if (wallet instanceof BrowserWallet) return navigate('/bridge');
		} catch (error) {
			setShowNoWalletMessage(WalletErrors.WalletNotEnabled);
		}

	}
	return (
		<>
		<CssBaseline />
		<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
			{showNoWalletMessage ?
				<WalletErrorMessage type={showNoWalletMessage} onClose={() => setShowNoWalletMessage(undefined)} /> :
				<Box sx={{ mt: 2 }}>
					<FormControl fullWidth>
						<InputLabel id="wallet-select-label">Select wallet</InputLabel>
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


export default App;
