import { ChainEnum } from '../common/enum';

export const PRIME_NETWORK_ID = 0;
export const VECTOR_NETWORK_ID = 2;
export const NEXUS_NETWORK_ID = BigInt(9070); // for Nexus
// TODO: check cardano network ID
export const CARDANO_NETWORK_ID = 4;

export const CHAIN_TO_CHAIN_ID = {
	[ChainEnum.Prime]: 1,
	[ChainEnum.Vector]: 2,
	[ChainEnum.Nexus]: 3,
	[ChainEnum.Cardano]: 4,
};

export const fromNetworkIdToChain = (
	networkId: number | bigint,
): ChainEnum | undefined => {
	switch (networkId) {
		case PRIME_NETWORK_ID: {
			return ChainEnum.Prime;
		}
		case VECTOR_NETWORK_ID: {
			return ChainEnum.Vector;
		}
		case NEXUS_NETWORK_ID: {
			return ChainEnum.Nexus;
		}
		case CARDANO_NETWORK_ID: {
			return ChainEnum.Cardano;
		}
		default:
			return;
	}
};

export const fromChainToNetworkId = (
	chain: ChainEnum,
): number | bigint | undefined => {
	switch (chain) {
		case ChainEnum.Prime: {
			return PRIME_NETWORK_ID;
		}
		case ChainEnum.Vector: {
			return VECTOR_NETWORK_ID;
		}
		case ChainEnum.Nexus: {
			return NEXUS_NETWORK_ID;
		}
		case ChainEnum.Cardano: {
			return CARDANO_NETWORK_ID;
		}
		default:
			return;
	}
};

export const areChainsEqual = (
	chain: ChainEnum,
	networkId: number | bigint,
): boolean => {
	return chain === fromNetworkIdToChain(networkId);
};

export const toNumChainID = (chain: ChainEnum) => CHAIN_TO_CHAIN_ID[chain];
