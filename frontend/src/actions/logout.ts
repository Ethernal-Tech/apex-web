import WalletHandler from "../features/WalletHandler";
import { resetDestinationNetworktAction, resetSourceNetworktAction } from "../redux/slices/networkSlice";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeAccountInfoAction, removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeWalletAction());
    dispatch(resetSourceNetworktAction())
    dispatch(resetDestinationNetworktAction())
    dispatch(removeAccountInfoAction());
    WalletHandler.clearEnabledWallet();
}