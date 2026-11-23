import {
	BadGatewayException,
	BadRequestException,
	ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { SolanaRpcService } from './solanaRpc.service';

jest.mock('axios');
const post = axios.post as jest.MockedFunction<typeof axios.post>;

const RPC_URL = 'https://rpc.example';

function makeService(solanaUrl: string | undefined = RPC_URL) {
	return new SolanaRpcService({
		rpc: { solanaUrl },
	} as unknown as AppConfigService);
}

describe('SolanaRpcService.forward', () => {
	beforeEach(() => post.mockReset());

	it('forwards an allowed request and returns the upstream body unchanged', async () => {
		const upstream = { jsonrpc: '2.0', id: 7, result: { value: 42 } };
		post.mockResolvedValue({ status: 200, data: upstream });

		const result = await makeService().forward({
			jsonrpc: '2.0',
			id: 7,
			method: 'getBalance',
			params: ['addr', { commitment: 'confirmed' }],
			extra: 'dropped',
		});

		expect(result).toEqual({ status: 200, data: upstream });
		expect(post).toHaveBeenCalledWith(
			RPC_URL,
			{
				jsonrpc: '2.0',
				id: 7,
				method: 'getBalance',
				params: ['addr', { commitment: 'confirmed' }],
			},
			expect.objectContaining({ timeout: 15_000 }),
		);
	});

	it('passes an upstream error status through', async () => {
		const upstream = {
			jsonrpc: '2.0',
			error: { code: 429, message: 'Too many requests' },
			id: 1,
		};
		post.mockResolvedValue({ status: 429, data: upstream });

		await expect(
			makeService().forward({ method: 'getSignatureStatuses', params: [] }),
		).resolves.toEqual({ status: 429, data: upstream });
	});

	it('defaults id and params', async () => {
		post.mockResolvedValue({ status: 200, data: {} });

		await makeService().forward({ method: 'getFeeForMessage' });

		expect(post.mock.calls[0][1]).toEqual({
			jsonrpc: '2.0',
			id: 1,
			method: 'getFeeForMessage',
			params: [],
		});
	});

	it.each([
		['a method that is not allowed', { method: 'getProgramAccounts' }],
		['a missing method', { params: [] }],
		['a batch request', [{ method: 'getBalance' }]],
		['a non-array params', { method: 'getBalance', params: 'x' }],
		['an object id', { method: 'getBalance', id: {} }],
		['a null body', null],
	])('rejects %s without calling upstream', async (_, body) => {
		await expect(makeService().forward(body)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(post).not.toHaveBeenCalled();
	});

	it('fails with 503 when SOLANA_RPC_URL is not set', async () => {
		await expect(
			makeService(' ').forward({ method: 'getBalance' }),
		).rejects.toBeInstanceOf(ServiceUnavailableException);
		expect(post).not.toHaveBeenCalled();
	});

	it('fails with 502 when the node cannot be reached', async () => {
		post.mockRejectedValue(new Error('ECONNREFUSED'));

		await expect(
			makeService().forward({ method: 'sendTransaction', params: ['tx'] }),
		).rejects.toBeInstanceOf(BadGatewayException);
	});
});
