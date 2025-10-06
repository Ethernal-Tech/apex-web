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
import { getSrcChains, isEvmChain } from "../settings/chain";
import { retry, shortRetryOptions, shouldUseMainnet } from "../utils/generalUtils";

let onLoadCalled = false

const checkAndSetEvmData = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {
    const useMainnet = shouldUseMainnet(srcChain, dstChain);
    const networkId = await retry(evmWalletHandler.getNetworkId, shortRetryOptions.retryCnt, shortRetryOptions.waitTime);
    const network = fromEvmNetworkIdToNetwork(networkId, useMainnet);
    if (!network) {
        const expectedNetworkId = fromChainToNetworkId(srcChain, useMainnet);
        throw new Error(`Invalid networkId: ${networkId}. Expected networkId: ${expectedNetworkId}. Please select network with networkId: ${expectedNetworkId} in your wallet.`);
    }

    if (!checkChainCompatibility(srcChain, network, networkId, useMainnet)) {
        const expectedNetwork = fromChainToNetworkId(srcChain, useMainnet);
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`);
    }

    if (!getSrcChains().some(x => x === srcChain)) {
        throw new Error(`Chain: ${srcChain} not supported.`);
    }

    const account = await retry(evmWalletHandler.getAddress, shortRetryOptions.retryCnt, shortRetryOptions.waitTime);
    if (!account) {
        throw new Error('No accounts connected')
    }

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: {},
    }))
}

const onEvmAccountsChanged = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch): Promise<void> => {
    try {
        await checkAndSetEvmData(selectedWalletName, srcChain, dstChain, dispatch)
    } catch (e) {
        const we = `Error on evm accounts changed. ${e}`
        console.log(we)
        toast.error(we);

        logout(dispatch)
    }
}

const enableEvmWallet = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {
    const expectedChainId = fromChainToNetworkId(srcChain, shouldUseMainnet(srcChain, dstChain));
    if (!expectedChainId) {
        throw new Error(`Chain ${srcChain} not supported.`);
    }

    await evmWalletHandler.enable(
        BigInt(expectedChainId),
        (_: string[]) => onEvmAccountsChanged(selectedWalletName, srcChain, dstChain, dispatch),
        (_: string) => onEvmAccountsChanged(selectedWalletName, srcChain, dstChain, dispatch)
    );
    let success = evmWalletHandler.checkWallet()

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    await checkAndSetEvmData(selectedWalletName, srcChain, dstChain, dispatch)
    
    return true
}

const enableCardanoWallet = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {
    await walletHandler.enable(selectedWalletName);
    let success = walletHandler.checkWallet();

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    const useMainnet = shouldUseMainnet(srcChain, dstChain);
    const networkId = await walletHandler.getNetworkId();
    const network = await walletHandler.getNetwork();
    if (!network) {
        const expectedNetwork = fromChainToNetwork(srcChain, useMainnet)
        throw new Error(`Invalid network: ${network}. Expected network: ${expectedNetwork}. Please select ${expectedNetwork} network in your wallet.`);
    }

    if (!checkChainCompatibility(srcChain, network, networkId, useMainnet)) {
        const expectedNetwork = fromChainToNetwork(srcChain, useMainnet)
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`);
    }

    if (!getSrcChains().some(x => x === srcChain)) {
        throw new Error(`Chain: ${srcChain} not supported.`);
    }

    const account = await walletHandler.getChangeAddress();

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: {},
    }))

    return true;
}

const enableWallet = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {// 1. nexus (evm metamask) wallet login handling
    if (isEvmChain(srcChain)) {
        try {
            return await enableEvmWallet(selectedWalletName, srcChain, dstChain, dispatch)
        } catch (e) {
            console.log(e)
            toast.error(`${e}`);
        }

        evmWalletHandler.clearEnabledWallet()
        return false;
    }

    // 2. prime and vector (cardano eternl) wallet login handling
    try {
        return await enableCardanoWallet(selectedWalletName, srcChain, dstChain, dispatch)
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
    }

    walletHandler.clearEnabledWallet()
    return false;
}


const connectWallet = async (wallet: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {
    dispatch(setConnectingAction(true));
    const success = await enableWallet(wallet, srcChain, dstChain, dispatch);
    dispatch(setConnectingAction(false));

    return success;
}

export const onLoad = async (selectedWalletName: string, srcChain: ChainEnum, dstChain: ChainEnum, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await connectWallet(selectedWalletName, srcChain, dstChain, dispatch);
    !success && logout(dispatch);
}

export const login = async (srcChain: ChainEnum, dstChain: ChainEnum, navigate: NavigateFunction, dispatch: Dispatch) => {
    let wallet 

    if (isEvmChain(srcChain)) {
        const wallets = evmWalletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    } else {
        const wallets = walletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    }


    if (!wallet) {
        const supportedWallets = isEvmChain(srcChain) ? EVM_SUPPORTED_WALLETS : SUPPORTED_WALLETS;
        toast.error(`Can not find any supported wallets installed. Supported wallets: ${supportedWallets}`);
        return false;
    }

    const success = await connectWallet(wallet, srcChain, dstChain, dispatch);

    if (success) {
        dispatch(setChainAction(srcChain))
        navigate(HOME_ROUTE);
    }

    return success;
}