import WalletHandler from "../features/WalletHandler";
import { setAccountInfoAction, setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";
import { toast } from "react-toastify";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, dispatch: Dispatch) => {
    try {
        const wallet = await WalletHandler.enable(selectedWalletName);
        const success = WalletHandler.checkWallet(wallet);
        if (success) {
            const networkId = await wallet.getNetworkId();
            const account = await wallet.getChangeAddress();

            dispatch(setWalletAction(selectedWalletName));
            dispatch(setAccountInfoAction({
                account, networkId,
            }))
        }

        return success;
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
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
    return await enableWallet(selectedWalletName, dispatch);
}