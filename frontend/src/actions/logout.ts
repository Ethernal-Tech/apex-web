import evmWalletHandler from '../features/EvmWalletHandler';
import WalletHandler from '../features/WalletHandler';
import { removeAccountInfoAction } from '../redux/slices/accountInfoSlice';
import { removeWalletAction } from '../redux/slices/walletSlice';
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
	dispatch(removeWalletAction());
	dispatch(removeAccountInfoAction());
	WalletHandler.clearEnabledWallet();
	evmWalletHandler.clearEnabledWallet();
};
