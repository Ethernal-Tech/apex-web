import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { fromChainToNativeTokenSymbol, fromChainToCurrencySymbol, fromNetworkToChain } from '../utils/chainUtils';
import { IBalanceState, updateBalanceAction } from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';
import appSettings from '../settings/appSettings';
import { UtxoRetriever } from '../features/types';
import BlockfrostRetriever from '../features/BlockfrostRetriever';
import OgmiosRetriever from '../features/OgmiosRetriever';
import { getUtxoRetrieverType } from '../features/utils';
import { UtxoRetrieverEnum } from '../features/enums';
import { getChainInfo, isEvmChain } from '../settings/chain';
import { getBridgingInfo } from '../settings/token';

const WALLET_UPDATE_BALANCE_INTERVAL = 5000;
const DEFAULT_UPDATE_BALANCE_INTERVAL = 30000;

const getWalletBalanceAction = async (srcChain: ChainEnum, dstChain: ChainEnum): Promise<IBalanceState> => {
    const bridgingInfo = getBridgingInfo(srcChain, dstChain);
    const currencyTokenName = getChainInfo(srcChain).currencyToken;
    if (isEvmChain(srcChain)) {
        const balances : {[key : string] : string} = {}
        // if (srcChain != ChainEnum.Nexus){

        // }

        const nexusBalance = await evmWalletHandler.getBalance();
        balances[currencyTokenName] = nexusBalance
        
        return { balance: balances};
    }

    let utxoRetriever: UtxoRetriever = walletHandler;
    const addr = await walletHandler.getChangeAddress();
    const utxoRetrieverConfig = !!appSettings.utxoRetriever && appSettings.utxoRetriever[srcChain];
    
    const utxoRetrieverType = getUtxoRetrieverType(srcChain);

    if (utxoRetrieverType === UtxoRetrieverEnum.Blockfrost) {
        utxoRetriever = new BlockfrostRetriever(
            addr, utxoRetrieverConfig.url, utxoRetrieverConfig.dmtrApiKey);
    } else if (utxoRetrieverType === UtxoRetrieverEnum.Ogmios) {
        utxoRetriever = new OgmiosRetriever(
            addr, utxoRetrieverConfig.url);
    }

    const utxos = await utxoRetriever.getAllUtxos();
    const balance = await utxoRetriever.getBalance(utxos);
    const finalBalance: { [key: string]: string } = {
        [currencyTokenName]: (balance[fromChainToCurrencySymbol(srcChain)] || BigInt(0)).toString(10)
    }
    if (!!bridgingInfo.wrappedToken) {
        finalBalance[bridgingInfo.wrappedToken!] = (balance[fromChainToNativeTokenSymbol(srcChain)] || BigInt(0)).toString(10);
    }
    return {
        balance: finalBalance,
        utxos,
    };
}

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {
    const srcChain = getCurrentSrcChain();
    const dstChain = store.getState().chain.destinationChain;
    if (!srcChain) {
        return;
    }

    try {
        const balanceState = await getWalletBalanceAction(srcChain, dstChain);
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
    
    return fromNetworkToChain(network);
}