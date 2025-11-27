import { captureException } from '../components/sentry/sentry';
import appSettings from '../settings/appSettings';
import { isEvmChain } from '../settings/chain';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { UtxoRetrieverEnum } from './enums';
import walletHandler from './WalletHandler';

const supportedWalletVersion = { major: 2, minor: 0, patch: 9, build: 14 };

export const getUtxoRetrieverType = (chain: ChainEnum): UtxoRetrieverEnum => {
	if (isEvmChain(chain)) {
		return UtxoRetrieverEnum.Wallet;
	}

	const walletVersion = walletHandler.version();
	const utxoRetrieverConfig =
		!!appSettings.utxoRetriever && appSettings.utxoRetriever[chain];

	if (
		utxoRetrieverConfig &&
		(utxoRetrieverConfig.force || !walletSupported(walletVersion))
	) {
		if (utxoRetrieverConfig.url) {
			if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Blockfrost) {
				return UtxoRetrieverEnum.Blockfrost;
			} else if (utxoRetrieverConfig.type === UtxoRetrieverEnum.Ogmios) {
				return UtxoRetrieverEnum.Ogmios;
			} else {
				console.log(
					`Unknown utxo retriever type: ${utxoRetrieverConfig.type}`,
				);
				captureException(
					`Unknown utxo retriever type: ${utxoRetrieverConfig.type}`,
					{
						tags: {
							component: 'utils.ts',
							action: 'getUtxoRetrieverType',
						},
					},
				);
			}
		} else {
			console.log(
				`utxo retriever url not provided for: ${utxoRetrieverConfig.type}`,
			);
			captureException(
				`utxo retriever url not provided for: ${utxoRetrieverConfig.type}`,
				{
					tags: {
						component: 'utils.ts',
						action: 'getUtxoRetrieverType',
					},
				},
			);
		}
	}

	return UtxoRetrieverEnum.Wallet;
};

const walletSupported = (walletVersion: any): boolean => {
	if (
		!walletVersion ||
		typeof walletVersion.major !== 'number' ||
		typeof walletVersion.minor !== 'number' ||
		typeof walletVersion.patch !== 'number' ||
		typeof walletVersion.build !== 'number'
	) {
		// invalid wallet version format
		return false;
	}

	const { major, minor, patch, build } = supportedWalletVersion;
	return (
		walletVersion.major > major ||
		(walletVersion.major === major && walletVersion.minor > minor) ||
		(walletVersion.major === major &&
			walletVersion.minor === minor &&
			walletVersion.patch > patch) ||
		(walletVersion.major === major &&
			walletVersion.minor === minor &&
			walletVersion.patch === patch &&
			walletVersion.build >= build)
	);
};

export function compareBigInts(a: bigint, b: bigint): number {
	if (a < b) {
		return -1; // a comes before b
	} else if (a > b) {
		return 1; // b comes before a
	}
	return 0;
}
