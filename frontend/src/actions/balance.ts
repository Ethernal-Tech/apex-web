import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { BalanceResponseDto, ChainEnum, WalletControllerClient } from '../swagger/apexBridgeApiService';
import { fromNetworkIdToChain } from '../utils/chainUtils';
import { updateBalanceAction } from '../redux/slices/accountInfoSlice';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import evmWalletHandler from '../features/EvmWalletHandler';
import { TokenEnum } from '../features/enums';

export const getWalletBalanceAction = async (chain: ChainEnum, address: string) => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance()
        return new BalanceResponseDto({ balance: { [TokenEnum.APEX]: nexusBalance } })
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

    const balanceResp = await tryCatchJsonByAction(() => getWalletBalanceAction(chain, account)); 
    if (balanceResp instanceof ErrorResponse) {
        console.log(`Error while fetching wallet balance: ${balanceResp.err}`)
        return;
    }

    if (!balanceResp.balance) {
        return;
    }

    dispatch(updateBalanceAction(balanceResp.balance));
}