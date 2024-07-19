import { Avatar, Dialog, DialogContent, DialogContentText, DialogTitle, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE }  from '../PageRouter';
import { useDispatch } from 'react-redux';
import { ChainEnum} from '../../swagger/apexBridgeApiService';
import WalletHandler, { Wallet } from '../../features/WalletHandler';
import { login } from '../../actions/login';

function LoginPage() {
	const [connecting, setConnecting] = useState(false);
	const dispatch = useDispatch();
	
	const navigate = useNavigate();

	const installedWallets = useMemo(
		() => WalletHandler.getSupportedWallets(),
		[]
	)

	const chainId = ChainEnum.Prime; // hardcoded value for now

	async function handleWalletClick(selectedWallet: Wallet) {
		if (!selectedWallet) {
			return;
		}

		setConnecting(true);
		const success = await login(selectedWallet.name, chainId, dispatch);
		setConnecting(false);

		success && navigate(HOME_ROUTE);

	}
	return (
		<Dialog open>
			<DialogTitle>Please select a wallet to connect</DialogTitle>
			<List sx={{ pt: 0 }}>
				{installedWallets.map(wallet => (
					<ListItem disableGutters key={wallet.name}>
						<ListItemButton disabled={connecting} onClick={() => handleWalletClick(wallet)}>
							<ListItemAvatar>
								<Avatar>
									<img src={wallet.icon} alt={wallet.name} height={20} width={20} />
								</Avatar>
							</ListItemAvatar>
							<ListItemText primary={wallet.name} />
						</ListItemButton>
					</ListItem>
				))}
			</List>
			{installedWallets.length === 0 && (
				<DialogContent>
					<DialogContentText>
						You don't have any installed wallets.
					</DialogContentText>
				</DialogContent>
			)}
			{connecting && <LinearProgress />}
		</Dialog>
	);
}

export default LoginPage;
