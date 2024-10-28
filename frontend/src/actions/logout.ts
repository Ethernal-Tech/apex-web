import evmWalletHandler from "../features/EvmWalletHandler";
import WalletHandler from "../features/WalletHandler";
import { removeAccountInfoAction } from "../redux/slices/accountInfoSlice";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeWalletAction());
    dispatch(removeAccountInfoAction());
    WalletHandler.clearEnabledWallet();
    evmWalletHandler.clearEnabledWallet();
}