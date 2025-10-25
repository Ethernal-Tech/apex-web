import Web3 from 'web3';
import { Transaction } from 'web3-types';
import { toHex } from 'web3-utils';
import { wait } from '../utils/generalUtils';
import { SendTransactionOptions } from 'web3/lib/commonjs/eth.exports';

type Wallet = {
	name: string;
	icon: string;
	version: string;
};

export const EVM_SUPPORTED_WALLETS = [
	{
		name: 'MetaMask',
		icon: 'https://metamask.io/images/metamask-logo.png', // MetaMask icon URL
		version: 'N/A', // MetaMask does not provide API version directly
	},
];

const MAX_RETRY_COUNT = 5;
const RETRY_WAIT_TIME = 1000;

class EvmWalletHandler {
	private _enabled = false;
	private web3: Web3 | undefined;
	private onAccountsChanged: (accounts: string[]) => Promise<void> = () =>
		new Promise<void>(() => undefined);
	private onChainChanged: (chainId: string) => Promise<void> = () =>
		new Promise<void>(() => undefined);

	getInstalledWallets = (): Wallet[] => {
		if (typeof window.ethereum === 'undefined') return [];

		return EVM_SUPPORTED_WALLETS;
	};

	getWeb3 = (): Web3 | undefined => {
		if (this.web3 === undefined) {
			if (typeof window.ethereum === 'undefined') {
				return;
			}

			this.web3 = new Web3(window.ethereum);
			this.web3.transactionBlockTimeout = 200;
		}

		return this.web3;
	};

	accountsChanged = async (accounts: string[]) =>
		await this.onAccountsChanged(accounts);
	chainChanged = async (chainId: string) =>
		await this.onChainChanged(chainId);

	enable = async (
		expectedChainId: bigint,
		onAccountsChanged: (accounts: string[]) => Promise<void>,
		onChainChanged: (chainId: string) => Promise<void>,
	) => {
		if (!this.getWeb3()) {
			return;
		}

		this._enabled = true;

		this.onAccountsChanged = onAccountsChanged;
		this.onChainChanged = onChainChanged;
		window.ethereum.on('accountsChanged', this.accountsChanged);
		window.ethereum.on('chainChanged', this.chainChanged);

		await this.forceChainWithRetry(expectedChainId);

		try {
			await window.ethereum.request({ method: 'eth_requestAccounts' });
		} catch (error) {
			console.error('User denied account access');
			this._enabled = false;

			return;
		}
	};

	clearEnabledWallet = () => {
		this._enabled = false;
		if (typeof window.ethereum !== 'undefined') {
			window.ethereum.removeListener(
				'accountsChanged',
				this.accountsChanged,
			);
			window.ethereum.removeListener('chainChanged', this.chainChanged);
		}
	};

	private _isEnabled = () => !!this._enabled && !!this.getWeb3();

	checkWallet = (): boolean => this._isEnabled();

	private _checkWalletAndThrow = () => {
		if (!this.checkWallet()) {
			throw new Error('Wallet not enabled');
		}
	};

	private forceChainWithRetry = async (
		expectedChainId: bigint,
		retryCount = 1,
	): Promise<void> => {
		let wrongChain = false;
		try {
			const chainId = (await window.ethereum.request({
				method: 'eth_chainId',
			})) as unknown as string;
			wrongChain = parseChainId(chainId) !== expectedChainId;
		} catch (enableError: any) {
			const enableErr = enableError?.data?.originalError ?? enableError;
			if (retryCount < MAX_RETRY_COUNT && enableErr.code !== 4001) {
				if (enableErr.code === 4902) {
					wrongChain = true;
				} else {
					await wait(RETRY_WAIT_TIME);

					return await this.forceChainWithRetry(
						expectedChainId,
						retryCount + 1,
					);
				}
			} else {
				throw enableError;
			}
		}

		if (wrongChain) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: toHex(expectedChainId) }],
				});
			} catch (e) {
				console.log(e);

				throw new Error(
					`Failed to switch to network with ID: ${expectedChainId}. Try adding that network to the wallet first.`,
				);
			}

			await wait(RETRY_WAIT_TIME);

			return await this.forceChainWithRetry(
				expectedChainId,
				retryCount + 1,
			);
		}
	};

	// PROXY

	getAddress = async (): Promise<string | undefined> => {
		this._checkWalletAndThrow();
		const accounts = await this.getWeb3()!.eth.getAccounts();
		return accounts.length > 0 ? accounts[0] : undefined;
	};

	getBalance = async (): Promise<string> => {
		this._checkWalletAndThrow();
		const accounts = await this.getWeb3()!.eth.getAccounts();
		const balance = await this.getWeb3()!.eth.getBalance(accounts[0]);
		return this.getWeb3()!.utils.fromWei(balance, 'wei');
	};

	getNetworkId = async (): Promise<bigint> => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.net.getId();
	};

	submitTx = async (tx: Transaction, opts?: SendTransactionOptions) => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.sendTransaction(tx, undefined, opts);
	};

	estimateGas = async (tx: Transaction) => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.estimateGas(tx);
	};

	getGasPrice = async () => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.getGasPrice();
	};
}

const parseChainId = (chainId: string | number): bigint => {
	return BigInt(
		typeof chainId === 'number'
			? chainId
			: Number.parseInt(chainId, chainId.startsWith('0x') ? 16 : 10),
	);
};

const evmWalletHandler = new EvmWalletHandler();
export default evmWalletHandler;
