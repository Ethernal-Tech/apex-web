import { BadRequestException } from '@nestjs/common';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { fetchSolanaAddressBalance } from './balance.solana';

jest.mock('axios', () => {
	const actual = jest.requireActual<typeof import('axios')>('axios');
	return { ...actual, __esModule: true, default: { get: jest.fn() } };
});
const get = axios.get as jest.MockedFunction<typeof axios.get>;

const MINT_A = 'MintA111111111111111111111111111111111111111';
const MINT_B = 'MintB111111111111111111111111111111111111111';

describe('fetchSolanaAddressBalance', () => {
	beforeEach(() => {
		get.mockReset();
		get.mockResolvedValue({
			data: {
				chain: 'solana',
				address: 'owner',
				amount: '1500',
				tokens: [
					{ mint: MINT_A, amount: '7' },
					{ mint: MINT_B, amount: '0' },
				],
			},
		});
	});

	it('calls cardano-api Solana/GetBalance with the api key', async () => {
		await fetchSolanaAddressBalance(
			'http://cardano-api/',
			'key',
			'solana',
			'owner',
			[],
			1000,
		);

		expect(get).toHaveBeenCalledWith(
			'http://cardano-api/api/Solana/GetBalance?chainId=solana&address=owner',
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-API-KEY': 'key' }),
				timeout: 1000,
			}),
		);
	});

	it('returns every configured token when no filter is given', async () => {
		const result = await fetchSolanaAddressBalance(
			'http://cardano-api',
			'key',
			'solana',
			'owner',
			[],
			1000,
		);

		expect(result).toEqual({
			amount: '1500',
			tokens: [
				{ unit: MINT_A, amount: '7' },
				{ unit: MINT_B, amount: '0' },
			],
		});
	});

	it('keeps only the requested mints', async () => {
		const result = await fetchSolanaAddressBalance(
			'http://cardano-api',
			'key',
			'solana',
			'owner',
			[MINT_B],
			1000,
		);

		expect(result.tokens).toEqual([{ unit: MINT_B, amount: '0' }]);
	});

	it('maps an upstream error to BadRequest', async () => {
		get.mockRejectedValue(
			new AxiosError('fail', '500', undefined, undefined, {
				status: 500,
				statusText: 'Internal Server Error',
				headers: {},
				config: { headers: new AxiosHeaders() },
				data: { err: 'get balance: rpc down' },
			}),
		);

		await expect(
			fetchSolanaAddressBalance(
				'http://cardano-api',
				'key',
				'solana',
				'owner',
				[],
				1000,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
