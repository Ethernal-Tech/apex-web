import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { BalanceResponseDto, ChainEnum, WalletControllerClient } from '../swagger/apexBridgeApiService';
import { fromNetworkIdToChain } from '../utils/chainUtils';
import { updateBalanceAction } from '../redux/slices/accountInfoSlice';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import evmWalletHandler from '../features/EvmWalletHandler';
import { TokenEnum } from '../features/enums';

export const getWalletBalanceAction = async (srcChain: ChainEnum, address: string, dstChain: ChainEnum) => {
    if (srcChain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance()
        return new BalanceResponseDto({ balance: { [TokenEnum.APEX]: nexusBalance } })
    }
    
    const client = new WalletControllerClient();
    return client.getBalance(srcChain, address, dstChain);
}

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {
    const accountInfo = store.getState().accountInfo;
    const chainInfo = store.getState().chain;
    if (!accountInfo.account || !chainInfo.destinationChain) {
        return;
    }
    
    const {
        account,
        networkId,
    } = accountInfo;
    
    const srcChain = fromNetworkIdToChain(networkId);

    if (!srcChain) {
        return;
    }

    const balanceResp = await tryCatchJsonByAction(() => getWalletBalanceAction(srcChain, account, chainInfo.destinationChain)); 
    if (balanceResp instanceof ErrorResponse) {
        console.log(`Error while fetching wallet balance: ${balanceResp.err}`)
        return;
    }

    if (!balanceResp.balance) {
        return;
    }

    dispatch(updateBalanceAction(balanceResp.balance));
}