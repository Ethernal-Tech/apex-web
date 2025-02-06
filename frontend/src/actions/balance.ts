import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { BalanceResponseDto, ChainEnum } from '../swagger/apexBridgeApiService';
import { fromChainToChainCurrency, fromChainToChainNativeToken, fromChainToNativeTokenSymbol, fromChainToCurrencySymbol, fromNetworkIdToChain } from '../utils/chainUtils';
import { updateBalanceAction } from '../redux/slices/accountInfoSlice';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import evmWalletHandler from '../features/EvmWalletHandler';
import { TokenEnum } from '../features/enums';
import walletHandler from '../features/WalletHandler';

export const getWalletBalanceAction = async (srcChain: ChainEnum, address: string, dstChain: ChainEnum) => {
    if (srcChain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance()
        return new BalanceResponseDto({ balance: { [TokenEnum.APEX]: nexusBalance } })
    }
    
    const balance = await walletHandler.getBalance()
    const currencyBalance = (balance[fromChainToCurrencySymbol(srcChain)] || BigInt(0)).toString(10)
    const tokenBalance = (balance[fromChainToNativeTokenSymbol(srcChain)] || BigInt(0)).toString(10)
    return new BalanceResponseDto({
        balance: {
            [fromChainToChainCurrency(srcChain)]: currencyBalance,
            [fromChainToChainNativeToken(srcChain)]: tokenBalance,
        },
    })
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