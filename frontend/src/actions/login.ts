import walletHandler, { SUPPORTED_WALLETS } from '../features/WalletHandler';
import { setWalletAction } from '../redux/slices/walletSlice';
import { Dispatch } from 'redux';
import { logout } from './logout';
import { toast } from 'react-toastify';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import {
	checkChainCompatibility,
	fromChainToNetwork,
	fromChainToNetworkId,
	fromEvmNetworkIdToNetwork,
} from '../utils/chainUtils';
import evmWalletHandler, {
	EVM_SUPPORTED_WALLETS,
} from '../features/EvmWalletHandler';
import { setConnectingAction } from '../redux/slices/loginSlice';
import { setChainAction } from '../redux/slices/chainSlice';
import { NavigateFunction } from 'react-router-dom';
import { HOME_ROUTE } from '../pages/PageRouter';
import { setAccountInfoAction } from '../redux/slices/accountInfoSlice';
import { isEvmChain } from '../settings/chain';
import * as Sentry from '@sentry/react';
import { captureAndThrowError } from '../utils/generalUtils';

let onLoadCalled = false;

const checkAndSetEvmData = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	const networkId = await evmWalletHandler.getNetworkId();
	const network = fromEvmNetworkIdToNetwork(networkId);
	if (!network) {
		captureAndThrowError(
			`Invalid networkId: ${networkId}. Expected networkId: ${fromChainToNetworkId(chain)}. Please select network with networkId: ${fromChainToNetworkId(chain)} in your wallet.`,
			'login.ts',
			'checkAndSetEvmData',
		);
	}

	if (!checkChainCompatibility(chain, network, networkId)) {
		captureAndThrowError(
			`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${fromChainToNetwork(chain)}. Please switch your wallet to ${fromChainToNetwork(chain)} and try again.`,
			'login.ts',
			'checkAndSetEvmData',
		);
	}
	const account = await evmWalletHandler.getAddress();
	if (!account) {
		captureAndThrowError(
			`No accounts connected`,
			'login.ts',
			'checkAndSetEvmData',
		);
	}

	dispatch(setWalletAction(selectedWalletName));
	dispatch(
		setAccountInfoAction({
			account,
			networkId,
			network,
			balance: '0',
		}),
	);
};

const onEvmAccountsChanged = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
): Promise<void> => {
	try {
		await checkAndSetEvmData(selectedWalletName, chain, dispatch);
	} catch (e) {
		const we = `Error on evm accounts changed. ${e}`;
		console.log(we);
		toast.error(we);

		Sentry.captureException(we, {
			tags: {
				component: 'login.ts',
				action: 'onEvmAccountsChanged',
			},
		});

		await logout(dispatch);
	}
};

const enableEvmWallet = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	const expectedChainId = fromChainToNetworkId(chain);
	if (!expectedChainId) {
		captureAndThrowError(
			`Chain ${chain} not supported.`,
			'login.ts',
			'enableEvmWallet',
		);
	}

	await evmWalletHandler.enable(
		BigInt(expectedChainId),
		(_: string[]) =>
			onEvmAccountsChanged(selectedWalletName, chain, dispatch),
		(_: string) =>
			onEvmAccountsChanged(selectedWalletName, chain, dispatch),
	);
	const success = evmWalletHandler.checkWallet();

	if (!success) {
		captureAndThrowError(
			`Failed to connect to wallet.`,
			'login.ts',
			'enableEvmWallet',
		);
	}

	await checkAndSetEvmData(selectedWalletName, chain, dispatch);

	return true;
};

const enableCardanoWallet = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	await walletHandler.enable(selectedWalletName);
	const success = walletHandler.checkWallet();

	if (!success) {
		captureAndThrowError(
			`Failed to connect to wallet.`,
			'login.ts',
			'enableCardanoWallet',
		);
	}

	const networkId = await walletHandler.getNetworkId();
	const network = await walletHandler.getNetwork();
	if (!network) {
		captureAndThrowError(
			`Invalid network: ${network}. Expected network: ${fromChainToNetwork(chain)}. Please select ${fromChainToNetwork(chain)} network in your wallet.`,
			'login.ts',
			'enableCardanoWallet',
		);
	}

	if (!checkChainCompatibility(chain, network, networkId)) {
		captureAndThrowError(
			`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${fromChainToNetwork(chain)}. Please switch your wallet to ${fromChainToNetwork(chain)} and try again.`,
			'login.ts',
			'enableCardanoWallet',
		);
	}

	const account = await walletHandler.getChangeAddress();

	dispatch(setWalletAction(selectedWalletName));
	dispatch(
		setAccountInfoAction({
			account,
			networkId,
			network,
			balance: '0',
		}),
	);

	return true;
};

const enableWallet = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	// 1. nexus (evm metamask) wallet login handling
	if (isEvmChain(chain)) {
		try {
			return await enableEvmWallet(selectedWalletName, chain, dispatch);
		} catch (e) {
			console.log(e);
			toast.error(`${e}`);

			Sentry.captureException(e, {
				tags: {
					component: 'login.ts',
					action: 'enableWallet',
				},
			});
		}

		evmWalletHandler.clearEnabledWallet();
		return false;
	}

	// 2. prime and vector (cardano eternl) wallet login handling
	try {
		return await enableCardanoWallet(selectedWalletName, chain, dispatch);
	} catch (e) {
		console.log(e);
		toast.error(`${e}`);

		Sentry.captureException(e, {
			tags: {
				component: 'login.ts',
				action: 'enableWallet',
			},
		});
	}

	walletHandler.clearEnabledWallet();
	return false;
};

const connectWallet = async (
	wallet: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	dispatch(setConnectingAction(true));
	const success = await enableWallet(wallet, chain, dispatch);
	dispatch(setConnectingAction(false));

	return success;
};

export const onLoad = async (
	selectedWalletName: string,
	chain: ChainEnum,
	dispatch: Dispatch,
) => {
	if (onLoadCalled) {
		return;
	}

	onLoadCalled = true;

	const success = await connectWallet(selectedWalletName, chain, dispatch);
	!success && logout(dispatch);
};

export const login = async (
	chain: ChainEnum,
	navigate: NavigateFunction,
	dispatch: Dispatch,
) => {
	let wallet;

	if (isEvmChain(chain)) {
		const wallets = evmWalletHandler.getInstalledWallets();
		wallet = wallets.length > 0 ? wallets[0].name : undefined;
	} else {
		const wallets = walletHandler.getInstalledWallets();
		wallet = wallets.length > 0 ? wallets[0].name : undefined;
	}

	if (!wallet) {
		const supportedWallets = isEvmChain(chain)
			? EVM_SUPPORTED_WALLETS
			: SUPPORTED_WALLETS;

		const e = `Can not find any supported wallets installed. Supported wallets: ${supportedWallets}`;
		toast.error(e);

		Sentry.captureException(new Error(e), {
			tags: {
				component: 'login.ts',
				action: 'login',
			},
		});

		return false;
	}

	const success = await connectWallet(wallet, chain, dispatch);

	if (success) {
		dispatch(setChainAction(chain));
		navigate(HOME_ROUTE);
	}

	return success;
};
