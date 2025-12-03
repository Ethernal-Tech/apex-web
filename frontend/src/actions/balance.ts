import { Dispatch } from '@reduxjs/toolkit';
import { store } from '../redux/store';
import {
	BridgingSettingsTokenPairDto,
	ChainEnum,
} from '../swagger/apexBridgeApiService';
import { fromNetworkToChain } from '../utils/chainUtils';
import {
	IBalanceState,
	updateBalanceAction,
} from '../redux/slices/accountInfoSlice';
import evmWalletHandler from '../features/EvmWalletHandler';
import walletHandler from '../features/WalletHandler';
import appSettings from '../settings/appSettings';
import { UtxoRetriever } from '../features/types';
import BlockfrostRetriever from '../features/BlockfrostRetriever';
import OgmiosRetriever from '../features/OgmiosRetriever';
import { getUtxoRetrieverType } from '../features/utils';
import { UtxoRetrieverEnum } from '../features/enums';
import { isEvmChain } from '../settings/chain';
import { shouldUseMainnet } from '../utils/generalUtils';
import { ISettingsState } from '../settings/settingsRedux';
import { captureException } from '../features/sentry';
import {
	getCurrencyID,
	getTokenConfig,
	LovelaceTokenName,
} from '../settings/token';
import { normalizeNativeTokenKey } from '../utils/tokenUtils';

const WALLET_UPDATE_BALANCE_INTERVAL = 5000;
const DEFAULT_UPDATE_BALANCE_INTERVAL = 30000;

const getWalletBalanceAction = async (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	settings: ISettingsState,
): Promise<IBalanceState> => {
	const currencyID = getCurrencyID(settings, srcChain);
	const dirTokens = (
		(settings.directionConfig[srcChain] || {}).destChain[dstChain] || {}
	).map((x: BridgingSettingsTokenPairDto) => x.srcTokenID);

	if (currencyID && !dirTokens.includes(currencyID)) {
		dirTokens.push(currencyID);
	}

	if (isEvmChain(srcChain)) {
		const promises = [];
		for (let i = 0; i < dirTokens.length; ++i) {
			promises.push(
				dirTokens[i] === currencyID
					? evmWalletHandler.getBalance()
					: evmWalletHandler.getERC20Balance(
							getTokenConfig(settings, srcChain, dirTokens[i])!
								.chainSpecific,
						),
			);
		}

		const balances = await Promise.all(promises);

		const balancesMap: { [key: string]: string } = {};
		for (let i = 0; i < dirTokens.length; ++i) {
			balancesMap[dirTokens[i]] = balances[i];
		}

		return { balance: balancesMap };
	}

	let utxoRetriever: UtxoRetriever = walletHandler;
	const addr = await walletHandler.getChangeAddress();
	const utxoRetrieverConfig =
		!!appSettings.utxoRetriever && appSettings.utxoRetriever[srcChain];

	const utxoRetrieverType = getUtxoRetrieverType(srcChain);

	if (utxoRetrieverType === UtxoRetrieverEnum.Blockfrost) {
		utxoRetriever = new BlockfrostRetriever(
			addr,
			utxoRetrieverConfig.url,
			utxoRetrieverConfig.dmtrApiKey,
		);
	} else if (utxoRetrieverType === UtxoRetrieverEnum.Ogmios) {
		utxoRetriever = new OgmiosRetriever(addr, utxoRetrieverConfig.url);
	}

	const utxos = await utxoRetriever.getAllUtxos();
	const balance = await utxoRetriever.getBalance(utxos);

	const finalBalance: { [key: string]: string } = dirTokens.reduce(
		(acc: { [key: string]: string }, cv: number) => {
			acc[cv.toString()] = (
				balance[
					cv === currencyID
						? LovelaceTokenName
						: normalizeNativeTokenKey(
								getTokenConfig(settings, srcChain, cv)!
									.chainSpecific,
							)
				] || BigInt(0)
			).toString(10);

			return acc;
		},
		{},
	);

	return {
		balance: finalBalance,
		utxos,
	};
};

export const fetchAndUpdateBalanceAction = async (dispatch: Dispatch) => {
	const srcChain = getCurrentSrcChain();
	const dstChain = store.getState().chain.destinationChain;
	const lzChainsSettings = store.getState().settings;

	if (!srcChain) {
		return;
	}

	try {
		const balanceState = await getWalletBalanceAction(
			srcChain,
			dstChain,
			lzChainsSettings,
		);
		if (balanceState.balance) {
			dispatch(updateBalanceAction(balanceState));
		}
	} catch (e) {
		console.log(`Error while fetching wallet balance: ${e}`);
		captureException(e, {
			tags: {
				component: 'balance.ts',
				action: 'fetchAndUpdateBalanceAction',
			},
		});
	}
};

export const getUpdateBalanceInterval = (): number => {
	const srcChain = getCurrentSrcChain();
	if (!srcChain) {
		return DEFAULT_UPDATE_BALANCE_INTERVAL;
	}

	return getUtxoRetrieverType(srcChain) === UtxoRetrieverEnum.Wallet
		? WALLET_UPDATE_BALANCE_INTERVAL
		: DEFAULT_UPDATE_BALANCE_INTERVAL;
};

const getCurrentSrcChain = (): ChainEnum | undefined => {
	const accountInfo = store.getState().accountInfo;
	const chainInfo = store.getState().chain;
	if (!accountInfo.account || !chainInfo.destinationChain) {
		return;
	}

	const { network } = accountInfo;

	if (!network) {
		return;
	}

	return fromNetworkToChain(
		network,
		shouldUseMainnet(chainInfo.chain, chainInfo.destinationChain),
	);
};
