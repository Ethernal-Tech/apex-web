import walletHandler, { SUPPORTED_WALLETS } from "../features/WalletHandler";
import { setWalletAction } from "../redux/slices/walletSlice";
import { Dispatch } from 'redux';
import { logout } from "./logout";
import { toast } from "react-toastify";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { checkChainCompatibility, fromChainToNetwork, fromChainToNetworkId, fromEvmNetworkIdToNetwork } from "../utils/chainUtils";
import evmWalletHandler, { EVM_SUPPORTED_WALLETS } from "../features/EvmWalletHandler";
import { setConnectingAction } from "../redux/slices/loginSlice";
import { setChainAction } from "../redux/slices/chainSlice";
import { NavigateFunction } from "react-router-dom";
import { HOME_ROUTE } from "../pages/PageRouter";
import { setAccountInfoAction } from "../redux/slices/accountInfoSlice";

let onLoadCalled = false

const checkAndSetEvmData = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    const networkId = await evmWalletHandler.getNetworkId();
    const network = fromEvmNetworkIdToNetwork(networkId);
    if (!network) {
        throw new Error(`Invalid networkId: ${networkId}. Expected networkId: ${fromChainToNetworkId(chain)}. Please select network with networkId: ${fromChainToNetworkId(chain)} in your wallet.`);
    }

    if (!checkChainCompatibility(chain, network, networkId)) {
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${fromChainToNetwork(chain)}. Please switch your wallet to ${fromChainToNetwork(chain)} and try again.`);
    }
    const account = await evmWalletHandler.getAddress();
    if (!account) {
        throw new Error('No accounts connected')
    }

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: '0',
    }))
}

const onEvmAccountsChanged = async (_accounts: string[], selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch): Promise<void> => {
    try {
        await checkAndSetEvmData(selectedWalletName, chain, dispatch)
    } catch (e) {
        const we = `Error on evm accounts changed. ${e}`
        console.log(we)
        toast.error(we);

        await logout(dispatch)
    }
}

const enableEvmWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    await evmWalletHandler.enable(
        (accounts: string[]) => onEvmAccountsChanged(accounts, selectedWalletName, chain, dispatch));
    let success = evmWalletHandler.checkWallet()

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    await checkAndSetEvmData(selectedWalletName, chain, dispatch)
    
    return true
}

const enableCardanoWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {
    await walletHandler.enable(selectedWalletName);
    let success = walletHandler.checkWallet();

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    const networkId = await walletHandler.getNetworkId();
    const network = await walletHandler.getNetwork();
    if (!network) {
        throw new Error(`Invalid network: ${network}. Expected network: ${fromChainToNetwork(chain)}. Please select ${fromChainToNetwork(chain)} network in your wallet.`);
    }

    if (!checkChainCompatibility(chain, network, networkId)) {
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${fromChainToNetwork(chain)}. Please switch your wallet to ${fromChainToNetwork(chain)} and try again.`);
    }

    const account = await walletHandler.getChangeAddress();

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: '0',
    }))

    return true;
}

const enableWallet = async (selectedWalletName: string, chain: ChainEnum, dispatch: Dispatch) => {// 1. nexus (evm metamask) wallet login handling
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
    let wallet 

    if (chain === ChainEnum.Nexus) {
        const wallets = evmWalletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    } else {
        const wallets = walletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    }


    if (!wallet) {
        const supportedWallets = chain === ChainEnum.Nexus ? EVM_SUPPORTED_WALLETS : SUPPORTED_WALLETS;
        toast.error(`Can not find any supported wallets installed. Supported wallets: ${supportedWallets}`);
        return false;
    }

    const success = await connectWallet(wallet, chain, dispatch);

    if (success) {
        dispatch(setChainAction(chain))
        navigate(HOME_ROUTE);
    }

    return success;
}