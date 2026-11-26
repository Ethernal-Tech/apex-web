import { BadRequestException } from '@nestjs/common';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { getSolanaTxStatus } from './solanaTxStatus.helper';

jest.mock('axios', () => {
	const actual = jest.requireActual<typeof import('axios')>('axios');
	return { ...actual, __esModule: true, default: { get: jest.fn() } };
});
jest.mock('src/utils/generalUtils', () => ({
	getUrlAndApiKey: () => ({ url: 'http://cardano-api/', apiKey: 'key' }),
}));
const get = axios.get as jest.MockedFunction<typeof axios.get>;

const SIGNATURE = '5'.repeat(88);

describe('getSolanaTxStatus', () => {
	beforeEach(() => {
		get.mockReset();
		get.mockResolvedValue({ data: { status: 'confirmed' } });
	});

	it('calls cardano-api Solana/GetTxStatus and returns its body', async () => {
		await expect(
			getSolanaTxStatus('solana', SIGNATURE, '123'),
		).resolves.toEqual({ status: 'confirmed' });

		expect(get).toHaveBeenCalledWith(
			`http://cardano-api/api/Solana/GetTxStatus?chainId=solana&signature=${SIGNATURE}&lastValidBlockHeight=123`,
			expect.objectContaining({
				headers: expect.objectContaining({ 'X-API-KEY': 'key' }),
			}),
		);
	});

	it.each([
		['a non-Solana chain', 'prime', SIGNATURE, '123'],
		['an invalid signature', 'solana', '0xabc', '123'],
		['a missing signature', 'solana', undefined, '123'],
		['a non-numeric lastValidBlockHeight', 'solana', SIGNATURE, '12a'],
		['a missing lastValidBlockHeight', 'solana', SIGNATURE, undefined],
	])('rejects %s without calling upstream', async (_, chain, sig, height) => {
		await expect(
			getSolanaTxStatus(chain, sig as string, height as string),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(get).not.toHaveBeenCalled();
	});

	it('maps an upstream error to BadRequest', async () => {
		get.mockRejectedValue(
			new AxiosError('fail', '500', undefined, undefined, {
				status: 500,
				statusText: 'Internal Server Error',
				headers: {},
				config: { headers: new AxiosHeaders() },
				data: { err: 'get tx status: rpc down' },
			}),
		);

		await expect(
			getSolanaTxStatus('solana', SIGNATURE, '123'),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
