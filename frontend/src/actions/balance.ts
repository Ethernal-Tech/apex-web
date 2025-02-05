import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { fromNetworkIdToChain } from '../utils/chainUtils';
import { IBalanceState, updateBalanceAction } from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';

export const getWalletBalanceAction = async (chain: ChainEnum, address: string): Promise<IBalanceState> => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance();
        return { balance: nexusBalance };
    }
    
    const utxos = await walletHandler.getAllUtxos();
    const balance = await walletHandler.getBalance(utxos);

    return { balance, utxos };
}

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {
    const accountInfo = store.getState().accountInfo;
    if (!accountInfo.account) {
        return;
    }
    
    const {
        account,
        networkId,
    } = accountInfo;
    
    const chain = fromNetworkIdToChain(networkId);

    if (!chain) {
        return;
    }

    try {
        const balanceState = await getWalletBalanceAction(chain, account);
        if (balanceState.balance) {
            dispatch(updateBalanceAction(balanceState));
        }

    } catch (e) {
        console.log(`Error while fetching wallet balance: ${e}`);
    }
}