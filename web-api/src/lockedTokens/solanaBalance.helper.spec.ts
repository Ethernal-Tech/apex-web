import axios from 'axios';
import { readSplMintDecimals } from './solanaBalance.helper';

jest.mock('axios');

const post = axios.post as jest.Mock;

describe('readSplMintDecimals', () => {
	beforeEach(() => post.mockReset());

	it('returns the decimals from getTokenSupply', async () => {
		post.mockResolvedValue({
			data: {
				jsonrpc: '2.0',
				result: { value: { amount: '1', decimals: 6, uiAmount: 0.000001 } },
			},
		});

		await expect(readSplMintDecimals('http://rpc', 'Mint111')).resolves.toBe(6);
		expect(post).toHaveBeenCalledWith(
			'http://rpc',
			expect.objectContaining({
				method: 'getTokenSupply',
				params: ['Mint111', { commitment: 'confirmed' }],
			}),
			expect.anything(),
		);
	});

	it('throws on an RPC error body', async () => {
		post.mockResolvedValue({
			data: {
				error: { code: -32602, message: 'Invalid param: not a Token mint' },
			},
		});

		await expect(readSplMintDecimals('http://rpc', 'Bad111')).rejects.toThrow(
			'getTokenSupply failed: Invalid param: not a Token mint',
		);
	});

	it('throws when the answer has no decimals', async () => {
		post.mockResolvedValue({ data: { result: { value: {} } } });

		await expect(readSplMintDecimals('http://rpc', 'Mint111')).rejects.toThrow(
			'no decimals',
		);
	});
});
