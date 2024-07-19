import WalletHandler from "../features/WalletHandler";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeTokenAction } from "../redux/slices/tokenSlice";
import { removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeTokenAction());
    dispatch(removeWalletAction());
    WalletHandler.clearEnabledWallet();
}