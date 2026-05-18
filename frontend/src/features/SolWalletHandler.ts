import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import appSettings from '../settings/appSettings';
import { SolanaNetworkType, SolanaNetworkTypeMap } from './Address/types';
import { captureAndThrowError } from './sentry';

type Wallet = {
	name: string;
	icon: string;
	version: string;
};

export const SOL_SUPPORTED_WALLETS: Wallet[] = [
	{
		name: 'Phantom',
		icon: 'https://phantom.app/img/phantom-icon-purple.svg',
		version: 'N/A',
	},
];

class SolWalletHandler {
	private _provider: any | undefined;
	private _publicKey: PublicKey | undefined;
	private _connection: Connection | undefined;

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

	getInstalledWallets = (): Wallet[] => {
		if (!(window as any)?.phantom?.solana) return [];
		return SOL_SUPPORTED_WALLETS;
	};

	checkWallet = (): boolean => {
		return !!this._provider && !!this._publicKey;
	};

	enable = async (useMainnet?: boolean): Promise<boolean> => {
		this._connection = this.getConnection(useMainnet);
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
			if (this._provider?.disconnect) {
				await this._provider.disconnect();
			}
		} finally {
			this._provider = undefined;
			this._publicKey = undefined;
			this._connection = undefined;
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
		if (!this._publicKey || !this._connection || !this._provider) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'signAndSendTransaction',
			);
		}

		tx.feePayer = this._publicKey;

		const connection = this._connection;

		try {
			const signedTx = await this._provider.signTransaction(tx);

			const signature = await connection.sendRawTransaction(
				signedTx.serialize(),
				{ skipPreflight: false, preflightCommitment: 'confirmed' },
			);

			const latestBlockhash =
				await connection.getLatestBlockhash('confirmed');
			await connection.confirmTransaction(
				{
					signature,
					blockhash: latestBlockhash.blockhash,
					lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
				},
				'confirmed',
			);

			return signature;
		} catch (err: any) {
			console.error('Full error:', JSON.stringify(err, null, 2));
			console.error('Logs:', err?.logs);
			throw err;
		}
	};
}

const solWalletHandler = new SolWalletHandler();
export default solWalletHandler;
