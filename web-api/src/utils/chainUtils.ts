import { ChainEnum } from 'src/common/enum';
import { CardanoNetworkType } from './Address/types';

const NEXUS_TESTNET_CHAIN_ID = BigInt(9070);
const NEXUS_MAINNET_CHAIN_ID = BigInt(9069);

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
				: CardanoNetworkType.MainNetNetwork;
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

export const isEvmChain = function (chain: ChainEnum): boolean {
	return chain === ChainEnum.Nexus;
};

export const isCardanoChain = function (chain: ChainEnum): boolean {
	return chain === ChainEnum.Prime || chain === ChainEnum.Vector;
};

export const isAllowedDirection = function (
	originChain: ChainEnum,
	destinationChain: ChainEnum,
	allowedDirections: { [key: string]: string[] },
): boolean {
	if (allowedDirections[originChain] === undefined) {
		return false;
	}
	return allowedDirections[originChain].includes(destinationChain);
};
