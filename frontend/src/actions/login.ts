import walletHandler, { SUPPORTED_WALLETS } from "../features/WalletHandler";
import { setAccountInfoAction, setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";
import { toast } from "react-toastify";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "../utils/chainUtils";
import { setConnectingAction } from "../redux/slices/loginSlice";
import { setChainAction } from "../redux/slices/chainSlice";
import { NavigateFunction } from "react-router-dom";
import { HOME_ROUTE } from "../pages/PageRouter";
import { getWalletBalanceAction } from "./balance";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    try {
        await walletHandler.enable(selectedWalletName);
        let success = walletHandler.checkWallet();

        if (!success) {
            throw new Error('Failed to connect to wallet.');
        }

        const networkId = await walletHandler.getNetworkId();
        if (!areChainsEqual(chain, networkId)) {
            throw new Error(`chain: ${chain} not compatible with networkId: ${networkId}`);
        }

        const account = await walletHandler.getChangeAddress();
        const balanceResp = await getWalletBalanceAction(chain, account)

        dispatch(setWalletAction(selectedWalletName));
        dispatch(setAccountInfoAction({
            account, networkId, balance: balanceResp.balance || '0',
        }))

        return true;
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
    }

    walletHandler.clearEnabledWallet()

    return false;
}

const connectWallet = async (wallet: string, chain: ChainEnum, dispatch: Dispatch) => {
    dispatch(setConnectingAction(true));
    const success = await enableWallet(wallet, chain, dispatch);
    dispatch(setConnectingAction(false));

    return success;
}

export const onLoad = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await connectWallet(selectedWalletName, chain, dispatch);
    !success && logout(dispatch);
}

export const login = async (chain: ChainEnum, navigate: NavigateFunction, dispatch: Dispatch) => {
    const wallets = walletHandler.getInstalledWallets();
    const wallet = wallets.length > 0 ? wallets[0].name : undefined;

    if (!wallet) {
        toast.error(`Can not find any supported wallets installed. Supported wallets: ${SUPPORTED_WALLETS}`);
        return false;
    }

    const success = await connectWallet(wallet, chain, dispatch);

    if (success) {
        dispatch(setChainAction(chain))
        navigate(HOME_ROUTE);
    }

    return success;
}