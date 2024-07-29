import walletHandler from "../features/WalletHandler";
import EvmWalletHandler from "../features/EvmWalletHandler";
import { setAccountInfoAction, setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";
import { toast } from "react-toastify";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { areChainsEqual } from "../utils/chainUtils";
import evmWalletHandler from "../features/EvmWalletHandler";

let onLoadCalled = false

const enableWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {    
    // 1. nexus (evm metamask) wallet login handling
    if(chain === ChainEnum.Nexus){
        try {
            return await enableEvmWallet(selectedWalletName, chain, dispatch)
        } catch (e) {
            console.log(e)
            toast.error(`${e}`);
        }

        evmWalletHandler.clearEnabledWallet()
        return false;
    }

    // 2. prime and vector (cardano eternl) wallet login handling
    try {
        return await enableCardanoWallet(selectedWalletName, chain, dispatch)
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
    }

    walletHandler.clearEnabledWallet()
    return false;
}


const enableEvmWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    await EvmWalletHandler.enable();
    let success = evmWalletHandler.checkWallet()

    if (!success) {
        throw new Error('Check wallet failed.');
    }

    const networkId = await evmWalletHandler.getNetworkId();

    if (!areChainsEqual(chain, networkId)) {
        throw new Error(`networkId: ${networkId} not compatible with chain: ${chain}`);
    }
    const account = await evmWalletHandler.getChangeAddress();
    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId
    }))
    
    return true
}


const enableCardanoWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
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