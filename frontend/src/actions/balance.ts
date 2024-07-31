import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum, WalletControllerClient } from '../swagger/apexBridgeApiService';
import { fromNetworkIdToChain } from '../utils/chainUtils';
import { updateBalanceAction } from '../redux/slices/walletSlice';
import { tryCatchJsonByAction } from '../utils/fetchUtils';

export const getWalletBalanceAction = (chain: ChainEnum, address: string) => {
    const client = new WalletControllerClient();
    return client.getBalance(chain, address);
}

export const getAndUpdateBalanceAction = async (dispatch: Dispatch) => {
    const accountInfo = store.getState().wallet.accountInfo;
    if (!accountInfo) {
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

    const balanceResp = await tryCatchJsonByAction(() => getWalletBalanceAction(chain, account), dispatch); 
    if (!balanceResp.balance) {
        return;
    }

    dispatch(updateBalanceAction(balanceResp.balance));
}