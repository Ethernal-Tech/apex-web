import Web3 from 'web3';
import { BlockNumberOrTag, Numbers, Transaction } from 'web3-types';
import { toHex } from 'web3-utils';
import { ERC20_MIN_ABI } from './ABI';
import { shortRetryOptions, wait } from '../utils/generalUtils';
import { SendTransactionOptions } from 'web3/lib/commonjs/eth.exports';
import { captureAndThrowError, captureException } from './sentry';

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

class EvmWalletHandler {
	private _enabled = false;
	private web3: Web3 | undefined;
	private provider: any | undefined;
	private onAccountsChanged: (accounts: string[]) => Promise<void> = () =>
		new Promise<void>(() => undefined);
	private onChainChanged: (chainId: string) => Promise<void> = async () =>
		new Promise<void>(() => undefined);

	private getMetaMaskProvider = (): any | undefined => {
		const injected = (window as any).ethereum;
		if (!injected) return undefined;

		if (Array.isArray(injected.providers)) {
			return (
				injected.providers.find(
					(p: any) => p.isMetaMask && !p.isPhantom,
				) || undefined
			);
		}

		return injected.isMetaMask && !injected.isPhantom
			? injected
			: undefined;
	};

	getInstalledWallets = (): Wallet[] => {
		if (!this.getMetaMaskProvider()) return [];

		return EVM_SUPPORTED_WALLETS;
	};

	getWeb3 = (): Web3 | undefined => {
		if (this.web3 === undefined) {
			this.provider = this.getMetaMaskProvider();
			if (!this.provider) {
				return;
			}

			this.web3 = new Web3(this.provider);
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
		this.provider.on('accountsChanged', this.accountsChanged);
		this.provider.on('chainChanged', this.chainChanged);

		await this.forceChainWithRetry(expectedChainId);

		try {
			await this.provider.request({ method: 'eth_requestAccounts' });
		} catch (error) {
			console.error('User denied account access');
			this._enabled = false;

			return;
		}
	};

	clearEnabledWallet = () => {
		this._enabled = false;
		if (this.provider) {
			this.provider.removeListener(
				'accountsChanged',
				this.accountsChanged,
			);
			this.provider.removeListener('chainChanged', this.chainChanged);
		}
	};

	private _isEnabled = () => !!this._enabled && !!this.getWeb3();

	checkWallet = (): boolean => this._isEnabled();

	private _checkWalletAndThrow = () => {
		if (!this.checkWallet()) {
			captureAndThrowError(
				'Wallet not enabled',
				'EvmWalletHandler.ts',
				'_checkWalletAndThrow',
			);
		}
	};

	private forceChainWithRetry = async (
		expectedChainId: bigint,
		retryCount = 1,
	): Promise<void> => {
		let wrongChain = false;
		try {
			const chainId = (await this.provider.request({
				method: 'eth_chainId',
			})) as unknown as string;
			wrongChain = parseChainId(chainId) !== expectedChainId;
		} catch (enableError: any) {
			const enableErr = enableError?.data?.originalError ?? enableError;
			if (
				retryCount < shortRetryOptions.retryCnt &&
				enableErr.code !== 4001
			) {
				if (enableErr.code === 4902) {
					wrongChain = true;
				} else {
					await wait(shortRetryOptions.waitTime);

					return await this.forceChainWithRetry(
						expectedChainId,
						retryCount + 1,
					);
				}
			} else {
				captureAndThrowError(
					enableError,
					'EvmWalletHandler.ts',
					'forceChainWithRetry',
				);
			}
		}

		if (wrongChain) {
			try {
				await this.provider.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: toHex(expectedChainId) }],
				});
			} catch (e) {
				console.log(e);

				captureAndThrowError(
					`Failed to switch to network with ID: ${expectedChainId}. Try adding that network to the wallet first.`,
					'EvmWalletHandler.ts',
					'forceChainWithRetry',
				);
			}

			await wait(shortRetryOptions.waitTime);

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

	submitTx = (tx: Transaction, opts?: SendTransactionOptions) => {
		this._checkWalletAndThrow();
		return this.getWeb3()!.eth.sendTransaction(tx, undefined, opts);
	};

	estimateGas = async (tx: Transaction) => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.estimateGas(tx);
	};

	getFeeHistory = async (
		blockCount: Numbers,
		newestBlock: BlockNumberOrTag | undefined,
		rewardPercentiles: Numbers[],
	) => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.getFeeHistory(
			blockCount,
			newestBlock,
			rewardPercentiles,
		);
	};

	getGasPrice = async () => {
		this._checkWalletAndThrow();
		return await this.getWeb3()!.eth.getGasPrice();
	};

	getERC20Balance = async (tokenAddress: string) => {
		this._checkWalletAndThrow();
		const account = await this.getAddress();

		if (!account)
			captureAndThrowError(
				'No connected wallet address.',
				'EvmWalletHandler.ts',
				'getERC20Balance',
			);

		try {
			const web3 = this.getWeb3();
			const contract = new web3!.eth.Contract(
				ERC20_MIN_ABI,
				tokenAddress,
			);
			const rawBalResp = await contract.methods.balanceOf(account).call();
			const raw = Array.isArray(rawBalResp) ? rawBalResp[0] : rawBalResp;

			const balance = BigInt(raw);

			return web3!.utils.fromWei(balance, 'wei');
		} catch (e) {
			captureException(e, {
				tags: {
					component: 'EvmWalletHandler.ts',
					action: 'getERC20Balance',
				},
			});

			return '0';
		}
	};

	getBlock = async (
		blockNumberOrHash: BlockNumberOrTag | string = 'latest',
		returnTransactionObjects = false,
	) => {
		this._checkWalletAndThrow();

		return await this.getWeb3()!.eth.getBlock(
			blockNumberOrHash,
			returnTransactionObjects,
		);
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
