import WalletHandler from "../features/WalletHandler";
import { resetDestinationNetworktAction, resetSourceNetworktAction } from "../redux/slices/networkSlice";
import { removePKLoginAction } from "../redux/slices/pkLoginSlice";
import { removeTokenAction } from "../redux/slices/tokenSlice";
import { removeWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';

export const logout = (dispatch: Dispatch) => {
    dispatch(removePKLoginAction());
    dispatch(removeTokenAction());
    dispatch(removeWalletAction());
    dispatch(resetSourceNetworktAction())
    dispatch(resetDestinationNetworktAction())
    WalletHandler.clearEnabledWallet();
}