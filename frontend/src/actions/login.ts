import walletHandler from "../features/WalletHandler";
import { setAccountInfoAction, setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";
import { toast } from "react-toastify";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "../utils/chainUtils";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    try {
        await walletHandler.enable(selectedWalletName);
        let success = walletHandler.checkWallet();

        if (!success) {
            throw new Error('Check wallet failed.');
        }

        const networkId = await walletHandler.getNetworkId();
        if (!areChainsEqual(chain, networkId)) {
            throw new Error(`networkId: ${networkId} not compatible with chain: ${chain}`);
        }

        const account = await walletHandler.getChangeAddress();

        dispatch(setWalletAction(selectedWalletName));
        dispatch(setAccountInfoAction({
            account, networkId,
        }))

        return true;
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
    }

    walletHandler.clearEnabledWallet()

    return false;
}

export const onLoad = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await enableWallet(selectedWalletName, chain, dispatch);
    !success && logout(dispatch);
}

export const login = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    return await enableWallet(selectedWalletName, chain, dispatch);
}