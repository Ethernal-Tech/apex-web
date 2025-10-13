import { CardanoAddress } from '../features/Address/interfaces';
import { CardanoNetworkType } from '../features/Address/types';
import { ApexBridgeNetwork } from '../features/enums';
import appSettings from '../settings/appSettings';
import { isEvmChain } from '../settings/chain';
import {
	BridgeTransactionDto,
	ChainEnum,
	TransactionStatusEnum,
} from '../swagger/apexBridgeApiService';

const TESTNET_NEXUS_NETWORK_ID = BigInt(9070); // for Nexus testnet
const MAINNET_NEXUS_NETWORK_ID = BigInt(9069); // for Nexus mainnet

type ChainData = {
	mainnet: { networkID: number | bigint; network: ApexBridgeNetwork };
	testnet: { networkID: number | bigint; network: ApexBridgeNetwork };
};

const CHAIN_DATA: { [key: string]: ChainData } = {
	[ChainEnum.Prime]: {
		mainnet: {
			networkID: CardanoNetworkType.MainNetNetwork,
			network: ApexBridgeNetwork.MainnetPrime,
		},
		testnet: {
			networkID: CardanoNetworkType.TestNetNetwork,
			network: ApexBridgeNetwork.TestnetPrime,
		},
	},
	[ChainEnum.Vector]: {
		mainnet: {
			networkID: CardanoNetworkType.MainNetNetwork,
			network: ApexBridgeNetwork.MainnetVector,
		},
		testnet: {
			networkID: CardanoNetworkType.MainNetNetwork,
			network: ApexBridgeNetwork.TestnetVector,
		},
	},
	[ChainEnum.Nexus]: {
		mainnet: {
			networkID: MAINNET_NEXUS_NETWORK_ID,
			network: ApexBridgeNetwork.MainnetNexus,
		},
		testnet: {
			networkID: TESTNET_NEXUS_NETWORK_ID,
			network: ApexBridgeNetwork.TestnetNexus,
		},
	},
};

const NETWORK_TO_CHAIN: {
	mainnet: { [key: string]: ChainEnum };
	testnet: { [key: string]: ChainEnum };
} = {
	mainnet: {
		[ApexBridgeNetwork.MainnetPrime]: ChainEnum.Prime,
		[ApexBridgeNetwork.MainnetVector]: ChainEnum.Vector,
		[ApexBridgeNetwork.MainnetNexus]: ChainEnum.Nexus,
	},
	testnet: {
		[ApexBridgeNetwork.TestnetPrime]: ChainEnum.Prime,
		[ApexBridgeNetwork.TestnetVector]: ChainEnum.Vector,
		[ApexBridgeNetwork.TestnetNexus]: ChainEnum.Nexus,
	},
};

export const fromChainToNetwork = (
	chain: ChainEnum,
): ApexBridgeNetwork | undefined => {
	return appSettings.isMainnet
		? CHAIN_DATA[chain]?.mainnet?.network
		: CHAIN_DATA[chain]?.testnet?.network;
};

export const fromNetworkToChain = (
	network: ApexBridgeNetwork,
): ChainEnum | undefined => {
	return appSettings.isMainnet
		? NETWORK_TO_CHAIN.mainnet[network]
		: NETWORK_TO_CHAIN.testnet[network];
};

export const fromChainToNetworkId = (
	chain: ChainEnum,
): number | bigint | undefined => {
	return appSettings.isMainnet
		? CHAIN_DATA[chain]?.mainnet?.networkID
		: CHAIN_DATA[chain]?.testnet?.networkID;
};

export const fromEvmNetworkIdToNetwork = (
	networkId: bigint,
): ApexBridgeNetwork | undefined => {
	return appSettings.isMainnet
		? networkId === MAINNET_NEXUS_NETWORK_ID
			? ApexBridgeNetwork.MainnetNexus
			: undefined
		: networkId === TESTNET_NEXUS_NETWORK_ID
			? ApexBridgeNetwork.TestnetNexus
			: undefined;
};

export const checkChainCompatibility = (
	chain: ChainEnum,
	network: ApexBridgeNetwork,
	networkId: number | bigint,
): boolean => {
	return (
		fromChainToNetworkId(chain) === networkId &&
		fromNetworkToChain(network) === chain
	);
};

export const checkCardanoAddressCompatibility = (
	chain: ChainEnum,
	addr: CardanoAddress,
): boolean => {
	return fromChainToNetworkId(chain) === addr.GetNetwork();
};

const EXPLORER_URLS: {
	mainnet: { [key: string]: string };
	testnet: { [key: string]: string };
} = {
	mainnet: {
		[ChainEnum.Prime]: 'https://apexscan.org/en',
		[ChainEnum.Vector]: '',
		[ChainEnum.Nexus]: 'https://explorer.nexus.mainnet.apexfusion.org',
	},
	testnet: {
		[ChainEnum.Prime]:
			'https://beta-explorer.prime.testnet.apexfusion.org/en',
		[ChainEnum.Vector]: 'https://explorer.vector.testnet.apexfusion.org',
		[ChainEnum.Nexus]: 'https://explorer.nexus.testnet.apexfusion.org',
	},
};

const getExplorerTxUrl = (chain: ChainEnum, txHash: string) => {
	const base = appSettings.isMainnet
		? EXPLORER_URLS.mainnet[chain]
		: EXPLORER_URLS.testnet[chain];

	if (!base || base.trim() === '') return;

	let url;
	switch (chain) {
		case ChainEnum.Vector:
			url = `${base}/transaction/hash/${txHash}`;
			break;
		case ChainEnum.Prime: {
			url = `${base}/transaction/${txHash}/summary/`;
			break;
		}
		case ChainEnum.Nexus: {
			url = `${base}/tx/${txHash}`;
			break;
		}
		default:
			return;
	}

	return url;
};

export const getExplorerUrl = (tx: BridgeTransactionDto | undefined) => {
	if (!tx) {
		return;
	}

	if (
		tx.status === TransactionStatusEnum.ExecutedOnDestination &&
		tx.destinationTxHash
	) {
		const txHash =
			isEvmChain(tx.destinationChain) &&
			!tx.destinationTxHash.startsWith('0x')
				? `0x${tx.destinationTxHash}`
				: tx.destinationTxHash;

		return getExplorerTxUrl(tx.destinationChain, txHash);
	} else if (tx.sourceTxHash) {
		const txHash =
			isEvmChain(tx.originChain) && !tx.sourceTxHash.startsWith('0x')
				? `0x${tx.sourceTxHash}`
				: tx.sourceTxHash;

		return getExplorerTxUrl(tx.originChain, txHash);
	}
};

export const openExplorer = (tx: BridgeTransactionDto | undefined) => {
	const url = getExplorerUrl(tx);
	if (url) {
		window.open(url, '_blank');
	}
};
