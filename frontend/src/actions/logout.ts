import WalletHandler from "../features/WalletHandler";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeWalletAction());
    WalletHandler.clearEnabledWallet();
}