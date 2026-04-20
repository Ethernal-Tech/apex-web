import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createSolanaClient } from '@metamask/connect-solana';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import bs58 from 'bs58';
import appSettings from '../settings/appSettings';
import { SolanaNetworkType, SolanaNetworkTypeMap } from './Address/types';
import { captureAndThrowError } from './sentry';

export type SolWalletType = 'phantom' | 'metamask';

const SOLANA_CHAIN_IDS = {
	mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
	devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
	testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
} as const;

export const SOL_SUPPORTED_WALLETS: {
	name: string;
	type: SolWalletType;
}[] = [
	{
		name: 'MetaMask',
		type: 'metamask',
	},
	{
		name: 'Phantom',
		type: 'phantom',
	},
];

class SolWalletHandler {
	private _provider: any | undefined;
	private _publicKey: PublicKey | undefined;
	private _connection: Connection | undefined;
	private _walletType: SolWalletType | undefined;

	private _mmWallet: Wallet | undefined;
	private _mmAccount: WalletAccount | undefined;
	private _mmClient:
		| Awaited<ReturnType<typeof createSolanaClient>>
		| undefined;
	private _mmChainId: string | undefined;

	private resolvePhantomProvider(): any {
		const provider = (window as any)?.phantom?.solana;
		if (!provider) {
			captureAndThrowError(
				'Phantom provider not found. Make sure the Phantom extension is installed and unlocked.',
				'SolWalletHandler.ts',
				'resolvePhantomProvider',
			);
		}
		return provider;
	}

	private async initMetaMask(useMainnet: boolean): Promise<void> {
		const isMainnet = useMainnet ?? appSettings.isMainnet;
		const rpcUrl =
			SolanaNetworkTypeMap[
				isMainnet
					? SolanaNetworkType.MainNetNetwork
					: SolanaNetworkType.TestNetNetwork
			];
		const networkName = isMainnet ? 'mainnet' : 'testnet';

		this._mmClient = await createSolanaClient({
			dapp: {
				name: 'Apex Bridge',
				url: window.location.href,
			},
			api: {
				supportedNetworks: {
					[networkName]: rpcUrl,
				},
			},
		});

		this._mmWallet = this._mmClient.getWallet();
		this._mmChainId = isMainnet
			? SOLANA_CHAIN_IDS.mainnet
			: SOLANA_CHAIN_IDS.testnet;

		const connectFeature = this._mmWallet.features[
			'standard:connect'
		] as any;
		if (!connectFeature?.connect) {
			captureAndThrowError(
				'MetaMask wallet does not support standard:connect.',
				'SolWalletHandler.ts',
				'initMetaMask',
			);
		}

		const { accounts } = await connectFeature.connect();
		if (!accounts || accounts.length === 0) {
			captureAndThrowError(
				'MetaMask connect returned no accounts.',
				'SolWalletHandler.ts',
				'initMetaMask',
			);
		}

		this._mmAccount = accounts[0];
		this._publicKey = new PublicKey(this._mmAccount!.address);
	}

	private getConnection(useMainnet?: boolean): Connection {
		const isMainnet = useMainnet ?? appSettings.isMainnet;
		const rpcUrl =
			SolanaNetworkTypeMap[
				isMainnet
					? SolanaNetworkType.MainNetNetwork
					: SolanaNetworkType.TestNetNetwork
			];

		if (!rpcUrl) {
			captureAndThrowError(
				'Missing Solana RPC URL for selected network.',
				'SolWalletHandler.ts',
				'getConnection',
			);
		}

		return new Connection(rpcUrl, 'confirmed');
	}

	getInstalledWallets = (): typeof SOL_SUPPORTED_WALLETS => {
		return SOL_SUPPORTED_WALLETS.filter((w) => {
			if (w.type === 'phantom') {
				return !!(window as any)?.phantom?.solana;
			}
			if (w.type === 'metamask') {
				const eth = (window as any)?.ethereum;
				if (!eth) return false;
				if (Array.isArray(eth.providers)) {
					return eth.providers.some(
						(p: any) => p.isMetaMask && !p.isPhantom,
					);
				}
				return !!eth.isMetaMask && !eth.isPhantom;
			}
			return false;
		});
	};

	checkWallet = (): boolean => {
		if (this._walletType === 'metamask') {
			return !!this._mmWallet && !!this._publicKey;
		}
		return !!this._provider && !!this._publicKey;
	};

	enable = async (
		walletType: SolWalletType = 'metamask',
		useMainnet?: boolean,
	): Promise<boolean> => {
		this._walletType = walletType;
		this._connection = this.getConnection(useMainnet);

		if (walletType === 'metamask') {
			await this.initMetaMask(useMainnet ?? appSettings.isMainnet);
			return true;
		}

		this._provider = this.resolvePhantomProvider();

		const resp = await this._provider.connect();
		const publicKey = resp?.publicKey;

		if (!publicKey) {
			captureAndThrowError(
				'Phantom connect succeeded but returned no publicKey.',
				'SolWalletHandler.ts',
				'enable',
			);
		}

		this._publicKey =
			publicKey instanceof PublicKey
				? publicKey
				: new PublicKey(String(publicKey));

		return true;
	};

	disconnect = async (): Promise<void> => {
		try {
			if (this._walletType === 'metamask' && this._mmClient) {
				await this._mmClient.disconnect();
			} else if (this._provider?.disconnect) {
				await this._provider.disconnect();
			}
		} finally {
			this._provider = undefined;
			this._publicKey = undefined;
			this._connection = undefined;
			this._walletType = undefined;
			this._mmWallet = undefined;
			this._mmAccount = undefined;
			this._mmClient = undefined;
			this._mmChainId = undefined;
		}
	};

	getAddress = (): string => {
		if (!this._publicKey) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getAddress',
			);
		}
		return this._publicKey.toBase58();
	};

	getPublicKey = (): PublicKey => {
		if (!this._publicKey) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getPublicKey',
			);
		}
		return this._publicKey;
	};

	getBalanceLamports = async (): Promise<bigint> => {
		if (!this._connection || !this._publicKey) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getBalanceLamports',
			);
		}

		const lamports = await this._connection.getBalance(
			this._publicKey,
			'confirmed',
		);

		return BigInt(String(lamports));
	};

	signAndSendTransaction = async (tx: Transaction): Promise<string> => {
		if (!this._publicKey || !this._connection) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'signAndSendTransaction',
			);
		}

		tx.feePayer = this._publicKey;
		const { blockhash } =
			await this._connection.getLatestBlockhash('finalized');
		tx.recentBlockhash = blockhash;

		if (this._walletType === 'metamask') {
			return this.metaMaskSignAndSend(tx);
		}

		return this.phantomSignAndSend(tx);
	};

	private async phantomSignAndSend(tx: Transaction): Promise<string> {
		if (!this._provider) {
			captureAndThrowError(
				'Phantom provider not available.',
				'SolWalletHandler.ts',
				'phantomSignAndSend',
			);
		}

		const result = await this._provider.signAndSendTransaction(tx);

		if (typeof result === 'string') return result;
		if (result?.signature) return String(result.signature);
		if (result?.id) return String(result.id);

		return captureAndThrowError(
			'signAndSendTransaction returned an unexpected response shape.',
			'SolWalletHandler.ts',
			'phantomSignAndSend',
		);
	}

	private async metaMaskSignAndSend(tx: Transaction): Promise<string> {
		if (!this._mmWallet || !this._mmAccount || !this._mmChainId) {
			captureAndThrowError(
				'MetaMask wallet not initialized.',
				'SolWalletHandler.ts',
				'metaMaskSignAndSend',
			);
		}

		const feature = this._mmWallet!.features[
			'solana:signAndSendTransaction'
		] as any;
		if (!feature?.signAndSendTransaction) {
			captureAndThrowError(
				'MetaMask wallet does not support solana:signAndSendTransaction.',
				'SolWalletHandler.ts',
				'metaMaskSignAndSend',
			);
		}

		const serialized = tx.serialize({ verifySignatures: false });

		const [result] = await feature.signAndSendTransaction({
			account: this._mmAccount,
			transaction: serialized,
			chain: this._mmChainId,
		});

		if (result?.signature instanceof Uint8Array) {
			return bs58.encode(result.signature);
		}
		if (typeof result?.signature === 'string') {
			return result.signature;
		}

		return captureAndThrowError(
			'MetaMask signAndSendTransaction returned an unexpected response shape.',
			'SolWalletHandler.ts',
			'metaMaskSignAndSend',
		);
	}
}

const solWalletHandler = new SolWalletHandler();
export default solWalletHandler;
