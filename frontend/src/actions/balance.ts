import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { fromChainToChainCurrency, fromChainToChainNativeToken, fromChainToNativeTokenSymbol, fromChainToCurrencySymbol, fromNetworkToChain } from '../utils/chainUtils';
import { IBalanceState, updateBalanceAction } from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';
import appSettings from '../settings/appSettings';
import { UtxoRetriever } from '../features/types';
import BlockfrostRetriever from '../features/BlockfrostRetriever';

const getWalletBalanceAction = async (chain: ChainEnum): Promise<IBalanceState> => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance();
        return { balance: { [fromChainToChainCurrency(chain)]: nexusBalance } };
    }

    let utxoRetriever: UtxoRetriever = walletHandler;
    if (appSettings.blockfrost && appSettings.blockfrost[chain]?.baseUrl) {
        const addr = await walletHandler.getChangeAddress();
        utxoRetriever = new BlockfrostRetriever(
            addr, appSettings.blockfrost[chain].baseUrl, appSettings.blockfrost[chain]?.dmtrApiKey);
    }
    
    const utxos = await utxoRetriever.getAllUtxos();
    const balance = await utxoRetriever.getBalance(utxos);
    const currencyBalance = (balance[fromChainToCurrencySymbol(chain)] || BigInt(0)).toString(10);
    const tokenBalance = (balance[fromChainToNativeTokenSymbol(chain)] || BigInt(0)).toString(10);
    return {
        balance: {
            [fromChainToChainCurrency(chain)]: currencyBalance,
            [fromChainToChainNativeToken(chain)]: tokenBalance,
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
        const balanceState = await getWalletBalanceAction(srcChain);
        if (balanceState.balance) {
            dispatch(updateBalanceAction(balanceState));
        }

    } catch (e) {
        console.log(`Error while fetching wallet balance: ${e}`);
    }
}