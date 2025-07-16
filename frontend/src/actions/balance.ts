import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { fromNetworkToChain } from '../utils/chainUtils';
import { IBalanceState, updateBalanceAction } from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';
import appSettings from '../settings/appSettings';
import { UtxoRetriever } from '../features/types';
import BlockfrostRetriever from '../features/BlockfrostRetriever';
import OgmiosRetriever from '../features/OgmiosRetriever';
import { getUtxoRetrieverType } from '../features/utils';
import { UtxoRetrieverEnum } from '../features/enums';

const WALLET_UPDATE_BALANCE_INTERVAL = 5000;
const DEFAULT_UPDATE_BALANCE_INTERVAL = 30000;

const getWalletBalanceAction = async (chain: ChainEnum): Promise<IBalanceState> => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance();
        return { balance: nexusBalance };
    }
    
    let utxoRetriever: UtxoRetriever = walletHandler;

    const addr = await walletHandler.getChangeAddress();
    const utxoRetrieverConfig = !!appSettings.utxoRetriever && appSettings.utxoRetriever[chain];
    
    const utxoRetrieverType = getUtxoRetrieverType(chain);

    if (utxoRetrieverType === UtxoRetrieverEnum.Blockfrost) {
        utxoRetriever = new BlockfrostRetriever(
            addr, utxoRetrieverConfig.url, utxoRetrieverConfig.dmtrApiKey);
    } else if (utxoRetrieverType === UtxoRetrieverEnum.Ogmios) {
        utxoRetriever = new OgmiosRetriever(
            addr, utxoRetrieverConfig.url);
    }

    const utxos = await utxoRetriever.getAllUtxos();
    const balance = await utxoRetriever.getBalance(utxos);

    return { balance, utxos };
}

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {    
    const srcChain = getCurrentSrcChain();
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

export const getUpdateBalanceInterval = (): number => {
    const srcChain = getCurrentSrcChain();
    if (!srcChain) {
        return DEFAULT_UPDATE_BALANCE_INTERVAL;
    }

    return getUtxoRetrieverType(srcChain) === UtxoRetrieverEnum.Wallet
        ? WALLET_UPDATE_BALANCE_INTERVAL
        : DEFAULT_UPDATE_BALANCE_INTERVAL;
}

const getCurrentSrcChain = (): ChainEnum | undefined => {
    const accountInfo = store.getState().accountInfo;
    if (!accountInfo.account) {
        return;
    }
    
    const {
        network,
    } = accountInfo;

    if (!network) {
        return;
    }
    
    return fromNetworkToChain(network);
}