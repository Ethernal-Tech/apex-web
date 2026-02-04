import { CardanoNetworkType } from './Address/types';
import {
	GetPrefix,
	GetStakePrefix,
	IsAddressWithValidPrefix,
} from './Address/utils';
import {
	areChainsEqual,
	CHAIN_TO_CHAIN_ID,
	fromChainToNetworkId,
	toNumChainID,
} from './chainUtils';
import { ChainEnum } from '../common/enum';
import { capitalizeWord, splitStringIntoChunks } from './stringUtils';
import Web3 from 'web3';
import {
	convertApexToDfm,
	convertApexToWei,
	convertDfmToApex,
	convertDfmToWei,
	convertWeiToApex,
	convertWeiToDfm,
	fromWei,
	toWei,
} from './generalUtils';

jest.mock('web3', () => ({
	utils: {
		fromWei: jest.fn(),
		toWei: jest.fn(),
	},
}));

const NEXUS_TESTNET_NETWORK_ID = BigInt(9070);
const NEXUS_MAINNET_NETWORK_ID = BigInt(9069);

const POLYGON_TESTNET_NETWORK_ID = BigInt(80002);
const POLYGON_MAINNET_NETWORK_ID = BigInt(137);

describe('IsAddressWithValidPrefix', () => {
	it('should return true for address starting with "addr"', () => {
		const address = 'addr1q8gf7lnm4cxdy4u9szl7ndrfp8thcqgznr';
		expect(IsAddressWithValidPrefix(address)).toBe(true);
	});

	it('should return false for address starting with "vector"', () => {
		const address = 'vector1234567890abcdef';
		expect(IsAddressWithValidPrefix(address)).toBe(false);
	});

	it('should return true for address starting with "stake"', () => {
		const address = 'stakeabcdefg12345';
		expect(IsAddressWithValidPrefix(address)).toBe(true);
	});

	it('should return false for address not starting with "addr", "vector", or "stake"', () => {
		const address = 'randomprefix123';
		expect(IsAddressWithValidPrefix(address)).toBe(false);
	});

	it('should return false for an empty address', () => {
		const address = '';
		expect(IsAddressWithValidPrefix(address)).toBe(false);
	});
});

describe('GetPrefix', () => {
	it('should return "addr" for VectorTestNetNetwork', () => {
		const result = GetPrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('addr');
	});

	it('should return "addr" for VectorMainNetNetwork', () => {
		const result = GetPrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('addr');
	});

	it('should return "addr" for MainNetNetwork', () => {
		const result = GetPrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('addr');
	});

	it('should return "addr_test" for TestNetNetwork', () => {
		const result = GetPrefix(CardanoNetworkType.TestNetNetwork);
		expect(result).toBe('addr_test');
	});
});

describe('GetStakePrefix', () => {
	it('should return "stake" for MainNetNetwork', () => {
		const result = GetStakePrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('stake');
	});

	it('should return "stake" for VectorMainNetNetwork', () => {
		const result = GetStakePrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('stake');
	});

	it('should return "stake_test" for TestNetNetwork', () => {
		const result = GetStakePrefix(CardanoNetworkType.TestNetNetwork);
		expect(result).toBe('stake_test');
	});

	it('should return "stake" for VectorTestNetNetwork', () => {
		const result = GetStakePrefix(CardanoNetworkType.MainNetNetwork);
		expect(result).toBe('stake');
	});
});

describe('fromChainToNetworkId', () => {
	it('should return PRIME_NETWORK_ID for ChainEnum.Prime testnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Prime, false)).toBe(
			CardanoNetworkType.TestNetNetwork,
		);
	});

	it('should return VECTOR_NETWORK_ID for ChainEnum.Vector testnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Vector, true)).toBe(
			CardanoNetworkType.MainNetNetwork,
		);
	});

	it('should return NEXUS_NETWORK_ID for ChainEnum.Nexus testnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Nexus, false)).toBe(
			NEXUS_TESTNET_NETWORK_ID,
		);
	});

	it('should return NEXUS_MAINNET_NETWORK_ID for ChainEnum.Nexus mainnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Nexus, true)).toBe(
			NEXUS_MAINNET_NETWORK_ID,
		);
	});

	it('should return CARDANO_NETWORK_ID for ChainEnum.Cardano testnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Cardano, false)).toBe(
			CardanoNetworkType.TestNetNetwork,
		);
	});

	it('should return POLYGON_NETWORK_ID for ChainEnum.Polygon testnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Polygon, false)).toBe(
			POLYGON_TESTNET_NETWORK_ID,
		);
	});

	it('should return POLYGON_MAINNET_NETWORK_ID for ChainEnum.Polygon mainnet', () => {
		expect(fromChainToNetworkId(ChainEnum.Polygon, true)).toBe(
			POLYGON_MAINNET_NETWORK_ID,
		);
	});
	it('should return undefined for an unrecognized chain', () => {
		expect(fromChainToNetworkId('InvalidChain' as any, false)).toBeUndefined();
	});
});

describe('areChainsEqual', () => {
	it('should return true when the chain and networkId match for Prime', () => {
		expect(areChainsEqual(ChainEnum.Prime, 1, true)).toBe(true);
	});

	it('should return true when the chain and networkId match for Vector', () => {
		expect(areChainsEqual(ChainEnum.Vector, 1, false)).toBe(true);
	});

	it('should return true when the chain and networkId match for Nexus', () => {
		expect(
			areChainsEqual(ChainEnum.Nexus, NEXUS_TESTNET_NETWORK_ID, false),
		).toBe(true);
	});

	it('should return true when the chain and networkId match for Cardano', () => {
		expect(areChainsEqual(ChainEnum.Cardano, 0, false)).toBe(true);
	});

	it('should return true when the chain and networkId match for Polygon', () => {
		expect(
			areChainsEqual(ChainEnum.Polygon, POLYGON_TESTNET_NETWORK_ID, false),
		).toBe(true);
	});

	it('should return false when the chain and networkId do not match for Prime', () => {
		expect(
			areChainsEqual(ChainEnum.Prime, CHAIN_TO_CHAIN_ID.vector, false),
		).toBe(false);
	});

	it('should return false when the chain and networkId do not match for Vector', () => {
		expect(
			areChainsEqual(ChainEnum.Vector, CHAIN_TO_CHAIN_ID.nexus, false),
		).toBe(false);
	});

	it('should return false when the chain and networkId do not match for Nexus', () => {
		expect(
			areChainsEqual(ChainEnum.Nexus, CHAIN_TO_CHAIN_ID.cardano, false),
		).toBe(false);
	});

	it('should return false when the chain and networkId do not match for Cardano', () => {
		expect(
			areChainsEqual(ChainEnum.Cardano, CHAIN_TO_CHAIN_ID.prime, false),
		).toBe(false);
	});

	it('should return false when the chain and networkId do not match for Polygon', () => {
		expect(
			areChainsEqual(ChainEnum.Polygon, CHAIN_TO_CHAIN_ID.polygon, false),
		).toBe(false);
	});

	it('should return false when the networkId does not correspond to any known chain', () => {
		expect(areChainsEqual(ChainEnum.Prime, 999, false)).toBe(false);
	});

	it('should return false when the chain is an invalid value', () => {
		expect(
			areChainsEqual('InvalidChain' as any, CHAIN_TO_CHAIN_ID.prime, false),
		).toBe(false);
	});

	it('should return false when networkId is a bigint that does not match any known chain', () => {
		expect(areChainsEqual(ChainEnum.Prime, BigInt(999), false)).toBe(false);
	});
});

describe('toNumChainID', () => {
	it('should return 1 for ChainEnum.Prime', () => {
		expect(toNumChainID(ChainEnum.Prime)).toBe(CHAIN_TO_CHAIN_ID.prime);
	});

	it('should return 2 for ChainEnum.Vector', () => {
		expect(toNumChainID(ChainEnum.Vector)).toBe(CHAIN_TO_CHAIN_ID.vector);
	});

	it('should return 3 for ChainEnum.Nexus', () => {
		expect(toNumChainID(ChainEnum.Nexus)).toBe(CHAIN_TO_CHAIN_ID.nexus);
	});

	it('should return 4 for ChainEnum.Cardano', () => {
		expect(toNumChainID(ChainEnum.Cardano)).toBe(CHAIN_TO_CHAIN_ID.cardano);
	});

	it('should return 5 for ChainEnum.Polygon', () => {
		expect(toNumChainID(ChainEnum.Polygon)).toBe(CHAIN_TO_CHAIN_ID.polygon);
	});

	it('should return undefined for an invalid ChainEnum', () => {
		expect(toNumChainID('InvalidChain' as any)).toBeUndefined();
	});
});

describe('splitStringIntoChunks', () => {
	it('should split a string into chunks of the specified size', () => {
		const result = splitStringIntoChunks('abcdefghijklmnopqrstuvwxyz', 5);
		expect(result).toEqual(['abcde', 'fghij', 'klmno', 'pqrst', 'uvwxy', 'z']);
	});

	it('should handle a string that is smaller than the chunk size', () => {
		const result = splitStringIntoChunks('short', 10);
		expect(result).toEqual(['short']);
	});

	it('should split a string exactly into chunks with no remainder', () => {
		const result = splitStringIntoChunks('abcdefghij', 5);
		expect(result).toEqual(['abcde', 'fghij']);
	});

	it('should handle an empty string and return an empty array', () => {
		const result = splitStringIntoChunks('');
		expect(result).toEqual([]);
	});

	it('should use the default chunk size of 40 when size is not provided', () => {
		const longString = 'a'.repeat(120);
		const result = splitStringIntoChunks(longString);
		expect(result).toEqual(['a'.repeat(40), 'a'.repeat(40), 'a'.repeat(40)]);
	});

	it('should return a single chunk if the string length is equal to the chunk size', () => {
		const result = splitStringIntoChunks('1234567890', 10);
		expect(result).toEqual(['1234567890']);
	});

	it('should split string when the chunk size is 1', () => {
		const result = splitStringIntoChunks('hello', 1);
		expect(result).toEqual(['h', 'e', 'l', 'l', 'o']);
	});
});

describe('capitalizeWord', () => {
	it('should capitalize the first letter of a word', () => {
		expect(capitalizeWord('hello')).toBe('Hello');
	});

	it('should return the same word if the first letter is already capitalized', () => {
		expect(capitalizeWord('Hello')).toBe('Hello');
	});

	it('should return the empty string if the input is an empty string', () => {
		expect(capitalizeWord('')).toBe('');
	});

	it('should handle non-alphabetic characters', () => {
		expect(capitalizeWord('123abc')).toBe('123abc');
		expect(capitalizeWord('@hello')).toBe('@hello');
	});

	it('should return the same value for null or undefined', () => {
		expect(capitalizeWord(null as unknown as string)).toBe(null);
		expect(capitalizeWord(undefined as unknown as string)).toBe(undefined);
	});
});

describe('Conversion functions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should convert from Wei to a specified unit using fromWei', () => {
		const mockFromWei = Web3.utils.fromWei as jest.Mock;
		mockFromWei.mockReturnValue('100');

		const result = fromWei('1000000000000000000', 'ether');
		expect(result).toBe('100');
		expect(mockFromWei).toHaveBeenCalledWith('1000000000000000000', 'ether');
	});

	it('should convert to Wei with toWei', () => {
		const mockToWei = Web3.utils.toWei as jest.Mock;
		mockToWei.mockReturnValue('1000000000000000000');

		const result = toWei('100', 'ether');
		expect(result).toBe('1000000000000000000');
		expect(mockToWei).toHaveBeenCalledWith('100', 'ether');
	});

	it('should convert DFM to Apex correctly using fromWei (lovelace)', () => {
		const mockFromWei = Web3.utils.fromWei as jest.Mock;
		mockFromWei.mockReturnValue('200');

		const result = convertDfmToApex(200);
		expect(result).toBe('200');
		expect(mockFromWei).toHaveBeenCalledWith(200, 'lovelace');
	});

	it('should convert Apex to DFM correctly using toWei (lovelace)', () => {
		const mockToWei = Web3.utils.toWei as jest.Mock;
		mockToWei.mockReturnValue('300');

		const result = convertApexToDfm(300);
		expect(result).toBe('300');
		expect(mockToWei).toHaveBeenCalledWith(300, 'lovelace');
	});

	it('should convert Wei to Apex correctly using fromWei (ether)', () => {
		const mockFromWei = Web3.utils.fromWei as jest.Mock;
		mockFromWei.mockReturnValue('400');

		const result = convertWeiToApex('1000000000000000000');
		expect(result).toBe('400');
		expect(mockFromWei).toHaveBeenCalledWith('1000000000000000000', 'ether');
	});

	it('should convert Apex to Wei correctly using toWei (ether)', () => {
		const mockToWei = Web3.utils.toWei as jest.Mock;
		mockToWei.mockReturnValue('1000000000000000000');

		const result = convertApexToWei(500);
		expect(result).toBe('1000000000000000000');
		expect(mockToWei).toHaveBeenCalledWith(500, 'ether');
	});

	it('should convert Wei to DFM correctly using fromWei (custom unit)', () => {
		const mockFromWei = Web3.utils.fromWei as jest.Mock;
		mockFromWei.mockReturnValue('600');

		const result = convertWeiToDfm('1000000000000000000');
		expect(result).toBe('600');
		expect(mockFromWei).toHaveBeenCalledWith('1000000000000000000', 12);
	});

	it('should convert DFM to Wei correctly using toWei (custom unit)', () => {
		const mockToWei = Web3.utils.toWei as jest.Mock;
		mockToWei.mockReturnValue('1000000000000000000');

		const result = convertDfmToWei(600);
		expect(result).toBe('1000000000000000000');
		expect(mockToWei).toHaveBeenCalledWith(600, 12);
	});
});
