import { ChainApexBridgeEnum, ChainEnum } from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9069);

export const CHAIN_TO_CHAIN_ID = {
	[ChainApexBridgeEnum.Prime]: 1,
	[ChainApexBridgeEnum.Vector]: 2,
	[ChainApexBridgeEnum.Nexus]: 3,
	[ChainApexBridgeEnum.Cardano]: 4,
};

const fromChainToNetworkId = (
	chain: ChainApexBridgeEnum,
	isMainnet: boolean,
): number | bigint | undefined => {
	switch (chain) {
		case ChainApexBridgeEnum.Prime: {
			return isMainnet
				? CardanoNetworkType.MainNetNetwork
				: CardanoNetworkType.TestNetNetwork;
		}
		case ChainApexBridgeEnum.Vector: {
			return isMainnet
				? CardanoNetworkType.VectorMainNetNetwork
				: CardanoNetworkType.VectorTestNetNetwork;
		}
		case ChainApexBridgeEnum.Nexus: {
			return isMainnet ? NEXUS_MAINNET_CHAIN_ID : NEXUS_TESTNET_CHAIN_ID;
		}
		case ChainApexBridgeEnum.Cardano: {
			return isMainnet
				? CardanoNetworkType.MainNetNetwork
				: CardanoNetworkType.TestNetNetwork;
		}
		default:
			return;
	}
};

export const areChainsEqual = (
	chain: ChainApexBridgeEnum,
	networkId: number | bigint,
	isMainnet: boolean,
): boolean => {
	return networkId === fromChainToNetworkId(chain, isMainnet);
};

export const toNumChainID = (chain: ChainApexBridgeEnum) => CHAIN_TO_CHAIN_ID[chain];

export const isCardanoChain = (chain: ChainEnum) => 
	chain === ChainEnum.Cardano || chain === ChainEnum.Prime || chain === ChainEnum.Vector;