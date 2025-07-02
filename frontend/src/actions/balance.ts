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
import OgmiosRetriever from '../features/OgmiosRetriever';

const getWalletBalanceAction = async (chain: ChainEnum): Promise<IBalanceState> => {
    if (chain === ChainEnum.Nexus) { 
        const nexusBalance = await evmWalletHandler.getBalance();
        return { balance: { [fromChainToChainCurrency(chain)]: nexusBalance } };
    }

    let utxoRetriever: UtxoRetriever = walletHandler;

    const walletVersion = walletHandler.version();

    if (appSettings.utxoRetriever && 
        (appSettings.utxoRetriever[chain]?.force || walletSupported(walletVersion))
    ) {
        if (appSettings.utxoRetriever[chain]?.type === "blockfrost" && appSettings.utxoRetriever[chain]?.url) {
            const addr = await walletHandler.getChangeAddress();
            utxoRetriever = new BlockfrostRetriever(
                addr, appSettings.utxoRetriever[chain]?.url, appSettings.utxoRetriever[chain]?.dmtrApiKey);
        } else if (appSettings.utxoRetriever[chain]?.type === "ogmios") {
            const addr = await walletHandler.getChangeAddress();
            utxoRetriever = new OgmiosRetriever(
                addr, appSettings.utxoRetriever[chain]?.url, appSettings.utxoRetriever[chain]?.dmtrApiKey);
        } else {
            console.log(`Unknown utxo retriever type: ${appSettings.utxoRetriever[chain]?.type}`);
        }
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

const walletSupported = (walletVersion: any): boolean => {
    if (!walletVersion ||
        typeof walletVersion.major !== 'number' ||
        typeof walletVersion.minor !== 'number' ||
        typeof walletVersion.patch !== 'number' ||
        typeof walletVersion.build !== 'number' ) {
            // invalid wallet version format
        return false;
    }

    if (walletVersion.major > 2 ||
        (walletVersion.major === 2 && walletVersion.minor > 0) || 
        (walletVersion.major === 2 && walletVersion.minor === 0 && walletVersion.patch > 9) ||
        (walletVersion.major === 2 && walletVersion.minor === 0 && walletVersion.patch === 9 && walletVersion.build >= 14)
    ) {
        return true;
    }

    return false;
}