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
import { shouldUseMainnet } from "../utils/generalUtils";

let onLoadCalled = false

const checkAndSetEvmData = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {
    const useMainnet = shouldUseMainnet(chain, destinationChain);
    const networkId = await evmWalletHandler.getNetworkId();
    const network = fromEvmNetworkIdToNetwork(networkId, useMainnet);
    if (!network) {
        const expectedNetworkId = fromChainToNetworkId(chain, useMainnet);
        throw new Error(`Invalid networkId: ${networkId}. Expected networkId: ${expectedNetworkId}. Please select network with networkId: ${expectedNetworkId} in your wallet.`);
    }

    if (!checkChainCompatibility(chain, network, networkId, useMainnet)) {
        const expectedNetwork = fromChainToNetworkId(chain, useMainnet);
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`);
    }

    if (!getSrcChains().some(x => x === chain)) {
        throw new Error(`Chain: ${chain} not supported.`);
    }

    const account = await evmWalletHandler.getAddress();
    if (!account) {
        throw new Error('No accounts connected')
    }

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: {},
    }))
}

const onEvmAccountsChanged = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch): Promise<void> => {
    try {
        await checkAndSetEvmData(selectedWalletName, chain, destinationChain, dispatch)
    } catch (e) {
        const we = `Error on evm accounts changed. ${e}`
        console.log(we)
        toast.error(we);

        logout(dispatch)
    }
}

const enableEvmWallet = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {
    const expectedChainId = fromChainToNetworkId(chain, shouldUseMainnet(chain, destinationChain));
    if (!expectedChainId) {
        throw new Error(`Chain ${chain} not supported.`);
    }

    await evmWalletHandler.enable(
        BigInt(expectedChainId),
        (_: string[]) => onEvmAccountsChanged(selectedWalletName, chain, destinationChain, dispatch),
        (_: string) => onEvmAccountsChanged(selectedWalletName, chain, destinationChain, dispatch)
    );
    let success = evmWalletHandler.checkWallet()

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    await checkAndSetEvmData(selectedWalletName, chain, destinationChain, dispatch)
    
    return true
}

const enableCardanoWallet = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {
    await walletHandler.enable(selectedWalletName);
    let success = walletHandler.checkWallet();

    if (!success) {
        throw new Error('Failed to connect to wallet.');
    }

    const useMainnet = shouldUseMainnet(chain, destinationChain);
    const networkId = await walletHandler.getNetworkId();
    const network = await walletHandler.getNetwork();
    if (!network) {
        const expectedNetwork = fromChainToNetwork(chain, useMainnet)
        throw new Error(`Invalid network: ${network}. Expected network: ${expectedNetwork}. Please select ${expectedNetwork} network in your wallet.`);
    }

    if (!checkChainCompatibility(chain, network, networkId, useMainnet)) {
        const expectedNetwork = fromChainToNetwork(chain, useMainnet)
        throw new Error(`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`);
    }

    if (!getSrcChains().some(x => x === chain)) {
        throw new Error(`Chain: ${chain} not supported.`);
    }

    const account = await walletHandler.getChangeAddress();

    dispatch(setWalletAction(selectedWalletName));
    dispatch(setAccountInfoAction({
        account, networkId, network, balance: {},
    }))

    return true;
}

const enableWallet = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {// 1. nexus (evm metamask) wallet login handling
    if (isEvmChain(chain)) {
        try {
            return await enableEvmWallet(selectedWalletName, chain, destinationChain, dispatch)
        } catch (e) {
            console.log(e)
            toast.error(`${e}`);
        }

        evmWalletHandler.clearEnabledWallet()
        return false;
    }

    // 2. prime and vector (cardano eternl) wallet login handling
    try {
        return await enableCardanoWallet(selectedWalletName, chain, destinationChain, dispatch)
    } catch (e) {
        console.log(e)
        toast.error(`${e}`);
    }

    walletHandler.clearEnabledWallet()
    return false;
}


const connectWallet = async (wallet: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {
    dispatch(setConnectingAction(true));
    const success = await enableWallet(wallet, chain, destinationChain, dispatch);
    dispatch(setConnectingAction(false));

    return success;
}

export const onLoad = async (selectedWalletName: string, chain: ChainEnum, destinationChain: ChainEnum, dispatch: Dispatch) => {
    if (onLoadCalled) {
        return
    }

    onLoadCalled = true;

    const success = await connectWallet(selectedWalletName, chain, destinationChain, dispatch);
    !success && logout(dispatch);
}

export const login = async (chain: ChainEnum, destinationChain: ChainEnum, navigate: NavigateFunction, dispatch: Dispatch) => {
    let wallet 

    if (isEvmChain(chain)) {
        const wallets = evmWalletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    } else {
        const wallets = walletHandler.getInstalledWallets();
        wallet = wallets.length > 0 ? wallets[0].name : undefined;
    }


    if (!wallet) {
        const supportedWallets = isEvmChain(chain) ? EVM_SUPPORTED_WALLETS : SUPPORTED_WALLETS;
        toast.error(`Can not find any supported wallets installed. Supported wallets: ${supportedWallets}`);
        return false;
    }

    const success = await connectWallet(wallet, chain, destinationChain, dispatch);

    if (success) {
        dispatch(setChainAction(chain))
        navigate(HOME_ROUTE);
    }

    return success;
}