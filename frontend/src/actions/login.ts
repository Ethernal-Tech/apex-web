import WalletHandler from "../features/WalletHandler";
import { setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, dispatch: Dispatch) => {
    try {
        const wallet = await WalletHandler.enable(selectedWalletName);
        const success = WalletHandler.checkWallet(wallet);
        if (success) {
            dispatch(setWalletAction(selectedWalletName));
        }

        return success;
    } catch (e) {
        console.log(e)
    }

    WalletHandler.clearEnabledWallet()

    return false;
}

export const onLoad = async (selectedWalletName: string, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await enableWallet(selectedWalletName, dispatch);
    !success && logout(dispatch);
}

export const login = async (selectedWalletName: string, dispatch: Dispatch) => {
    try {
        const wallet = await WalletHandler.enable(selectedWalletName);
        const success = WalletHandler.checkWallet(wallet);
        if (success) {
            dispatch(setWalletAction(selectedWalletName));
        }

        return success;
    } catch (e) {
        console.log(e)
    }

    WalletHandler.clearEnabledWallet()

    return false;
}