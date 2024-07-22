import walletHandler from "../features/WalletHandler";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeAccountInfoAction, removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeWalletAction());
    dispatch(removeAccountInfoAction());
    walletHandler.clearEnabledWallet();
}