import { ChainEnum } from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9070); // TODO: CHANGE WHEN WE FIND OUT

const CHAIN_TO_CHAIN_ID = {
	[ChainEnum.Prime]: 1,
	[ChainEnum.Vector]: 2,
	[ChainEnum.Nexus]: 3,
};

const fromChainToNetworkId = (
	chain: ChainEnum,
	isMainnet: boolean,
): number | bigint | undefined => {
	switch (chain) {
		case ChainEnum.Prime: {
			return isMainnet
				? CardanoNetworkType.MainNetNetwork
				: CardanoNetworkType.TestNetNetwork;
		}
		case ChainEnum.Vector: {
			return isMainnet
				? CardanoNetworkType.VectorMainNetNetwork
				: CardanoNetworkType.VectorTestNetNetwork;
		}
		case ChainEnum.Nexus: {
			return isMainnet ? NEXUS_MAINNET_CHAIN_ID : NEXUS_TESTNET_CHAIN_ID;
		}
		default:
			return;
	}
};

export const areChainsEqual = (
	chain: ChainEnum,
	networkId: number | bigint,
	isMainnet: boolean,
): boolean => {
	return networkId === fromChainToNetworkId(chain, isMainnet);
};

export const toNumChainID = (chain: ChainEnum) => CHAIN_TO_CHAIN_ID[chain];
