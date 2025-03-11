import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { fromChainToChainCurrency, fromChainToChainNativeToken, fromChainToNativeTokenSymbol, fromChainToCurrencySymbol, fromNetworkToChain } from '../utils/chainUtils';
import { IBalanceState, updateBalanceAction } from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';

export const getWalletBalanceAction = async (srcChain: ChainEnum, address: string, dstChain: ChainEnum): Promise<IBalanceState> => {
    if (srcChain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance();
        return { balance: { [fromChainToChainCurrency(srcChain)]: nexusBalance } };
    }
    
    const utxos = await walletHandler.getAllUtxos();
    const balance = await walletHandler.getBalance(utxos);
    const currencyBalance = (balance[fromChainToCurrencySymbol(srcChain)] || BigInt(0)).toString(10);
    const tokenBalance = (balance[fromChainToNativeTokenSymbol(srcChain)] || BigInt(0)).toString(10);
    return {
        balance: {
            [fromChainToChainCurrency(srcChain)]: currencyBalance,
            [fromChainToChainNativeToken(srcChain)]: tokenBalance,
        },
        utxos,
    };
}

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {
    const accountInfo = store.getState().accountInfo;
    const chainInfo = store.getState().chain;
    if (!accountInfo.account || !chainInfo.destinationChain) {
        return;
    }
    
    const {
        account,
        network,
    } = accountInfo;

    if (!network) {
        return;
    }
    
    const srcChain = fromNetworkToChain(network);
    if (!srcChain) {
        return;
    }

    try {
        const balanceState = await getWalletBalanceAction(srcChain, account, chainInfo.destinationChain);
        if (balanceState.balance) {
            dispatch(updateBalanceAction(balanceState));
        }

    } catch (e) {
        console.log(`Error while fetching wallet balance: ${e}`);
    }
}