import appSettings from '../settings/appSettings';
import { captureAndThrowError, captureException } from './sentry';
import {
	confirmTransactionSignature,
	getBalanceLamports,
	getSplTokenBalanceLamports,
	sendRawTransactionBase64,
} from '../utils/solanaRpc';
import {
	base64ToUint8Array,
	createPhantomTransactionAdapter,
	uint8ArrayToBase64,
} from '../utils/solanaTx';

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
	private _address: string | undefined;
	private _useMainnet: boolean | undefined;

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

	getInstalledWallets = (): Wallet[] => {
		if (!(window as any)?.phantom?.solana) return [];
		return SOL_SUPPORTED_WALLETS;
	};

	checkWallet = (): boolean => {
		return !!this._provider && !!this._address;
	};

	enable = async (useMainnet?: boolean): Promise<boolean> => {
		this._useMainnet = useMainnet ?? appSettings.isMainnet;
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

		this._address =
			typeof publicKey === 'string'
				? publicKey
				: (publicKey?.toBase58?.() ?? String(publicKey));

		return true;
	};

	disconnect = async (): Promise<void> => {
		try {
			if (this._provider?.disconnect) {
				await this._provider.disconnect();
			}
		} finally {
			this._provider = undefined;
			this._address = undefined;
			this._useMainnet = undefined;
		}
	};

	getAddress = (): string => {
		if (!this._address) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getAddress',
			);
		}
		return this._address;
	};

	getBalanceLamports = async (): Promise<bigint> => {
		if (!this._address) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getBalanceLamports',
			);
		}

		return getBalanceLamports(this._address, this._useMainnet);
	};

	getSplTokenBalance = async (mintAddress: string): Promise<bigint> => {
		if (!this._address) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'getSplTokenBalance',
			);
		}

		try {
			return await getSplTokenBalanceLamports(
				this._address,
				mintAddress,
				this._useMainnet,
			);
		} catch (err) {
			captureException(err, {
				tags: {
					component: 'SolWalletHandler.ts',
					action: 'getSplTokenBalance',
					mintAddress,
				},
			});

			return BigInt(0);
		}
	};

	/**
	 * Signs and submits a server-built legacy transaction (base64) via Phantom.
	 */
	signAndSendTransaction = async (txRawBase64: string): Promise<string> => {
		if (!this._address || !this._provider) {
			captureAndThrowError(
				'Wallet not enabled.',
				'SolWalletHandler.ts',
				'signAndSendTransaction',
			);
		}

		const serializedTx = base64ToUint8Array(txRawBase64);
		const adapter = createPhantomTransactionAdapter(serializedTx);

		try {
			if (this._provider.signAndSendTransaction) {
				const result =
					await this._provider.signAndSendTransaction(adapter);
				const signature =
					typeof result === 'string' ? result : result?.signature;

				if (!signature) {
					throw new Error(
						'Phantom did not return a transaction signature',
					);
				}

				await confirmTransactionSignature(signature, this._useMainnet);
				return signature;
			}

			const signedTx = await this._provider.signTransaction(adapter);
			const signedBytes =
				typeof signedTx?.serialize === 'function'
					? signedTx.serialize()
					: signedTx;

			const signedBase64 = uint8ArrayToBase64(
				signedBytes instanceof Uint8Array
					? signedBytes
					: new Uint8Array(signedBytes),
			);
			const signature = await sendRawTransactionBase64(
				signedBase64,
				this._useMainnet,
			);
			await confirmTransactionSignature(signature, this._useMainnet);
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
