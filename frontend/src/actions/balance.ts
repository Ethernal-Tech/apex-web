import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum, WalletControllerClient } from '../swagger/apexBridgeApiService';
import { fromNetworkIdToChain } from '../utils/chainUtils';
import { updateBalanceAction } from '../redux/slices/accountInfoSlice';
import { tryCatchJsonByAction } from '../utils/fetchUtils';
import evmWalletHandler from '../features/EvmWalletHandler';

export const getWalletBalanceAction = async (chain: ChainEnum, address: string) => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance()
        return {
            balance: nexusBalance
        }
    }
    
    const client = new WalletControllerClient();
    return client.getBalance(chain, address);
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

    const balanceResp = await tryCatchJsonByAction(() => getWalletBalanceAction(chain, account), dispatch); 
    if (!balanceResp.balance) {
        return;
    }

    dispatch(updateBalanceAction(balanceResp.balance));
}