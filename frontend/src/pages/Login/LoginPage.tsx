import { Avatar, Dialog, DialogContent, DialogContentText, DialogTitle, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText } from '@mui/material';
import { BrowserWallet, Wallet } from '@meshsdk/core';
import { useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE }  from '../PageRouter';
import { useDispatch } from 'react-redux';
import { setTokenAction } from '../../redux/slices/tokenSlice';
import { getStakeAddress } from '../../utils/userWalletUtil';
import { generateLoginCodeAction, loginAction } from './action';
import { ChainEnum, DataSignatureDto, GenerateLoginCodeDto, LoginDto } from '../../swagger/apexBridgeApiService';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';

function LoginPage() {
	const [connecting, setConnecting] = useState(false);
	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();
	
	const navigate = useNavigate();

	const installedWallets = useMemo(
		() => BrowserWallet.getInstalledWallets(),
		[]
	)

	const chainID = ChainEnum.Prime; // hardcoded value for now

	async function handleWalletClick(selectedWallet: Wallet) {
		if (!selectedWallet) {
			return;
		}

		setConnecting(true);

		try {
			const wallet = await BrowserWallet.enable(selectedWallet.name);
			if (wallet && wallet instanceof BrowserWallet)  {
				// TODO: this probably should not be stake address
				const stakeAddress = await getStakeAddress(wallet);
				const address = stakeAddress.to_bech32();
				const bindedGenerateLoginCodeAction = generateLoginCodeAction.bind(null, new GenerateLoginCodeDto({ address, chainID }));
				const loginCode = await fetchFunction(bindedGenerateLoginCodeAction);
				if (!loginCode) {
					setConnecting(false);
					return;
				}
				const messageHex = Buffer.from(loginCode.code).toString("hex");

				const signedData = await wallet.signData(address, messageHex);
				const loginModel = new LoginDto({
					address,
					signedLoginCode: new DataSignatureDto(signedData),
					chainID
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

		}
		catch (err: any) {
			if (err instanceof Error) {
				console.log(err.stack)
			}
			setConnecting(false);
		}

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
