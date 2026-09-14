import { InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { ChainEnum } from 'src/common/enum';
import { getAppConfig } from 'src/appConfig/appConfig';
import { isCardanoChain, isSolanaChain } from 'src/utils/chainUtils';

const RPC_TIMEOUT_MS = 8000;

type JsonRpcResponse<T> = {
	result?: T;
	error?: { message?: string };
};

const postJson = async <T>(
	url: string,
	body: Record<string, unknown>,
): Promise<T> => {
	const response = await axios.post<JsonRpcResponse<T>>(url, body, {
		timeout: RPC_TIMEOUT_MS,
		headers: { 'Content-Type': 'application/json' },
	});

	if (response.data?.error) {
		throw new Error(response.data.error.message || 'JSON-RPC error');
	}

	if (response.data?.result === undefined || response.data.result === null) {
		throw new Error('JSON-RPC response missing result');
	}

	return response.data.result;
};

const getEvmLatestBlock = async (url: string): Promise<bigint> => {
	const result = await postJson<string>(url, {
		jsonrpc: '2.0',
		id: 1,
		method: 'eth_blockNumber',
		params: [],
	});
	return BigInt(result);
};

const getSolanaLatestBlock = async (url: string): Promise<bigint> => {
	const result = await postJson<number>(url, {
		jsonrpc: '2.0',
		id: 1,
		method: 'getBlockHeight',
	});
	return BigInt(result);
};

const getCardanoLatestSlot = async (chain: ChainEnum): Promise<bigint> => {
	const url = getAppConfig().cardanoSkylineApiUrl;
	const apiKey = process.env.CARDANO_API_SKYLINE_API_KEY || 'test_api_key';
	if (!url) {
		throw new InternalServerErrorException(
			'cardano api url not configured for skyline',
		);
	}

	const endpointUrl = `${url}/api/CardanoTx/GetLatestSlot?chainId=${chain}`;
	const response = await axios.get<{ slot?: string | number }>(endpointUrl, {
		timeout: RPC_TIMEOUT_MS,
		headers: { 'X-API-KEY': apiKey },
	});

	if (response.data?.slot === undefined || response.data.slot === null) {
		throw new Error('cardano-api GetLatestSlot missing slot');
	}

	return BigInt(response.data.slot);
};

const resolveRpcUrl = (chain: ChainEnum): string | undefined => {
	const rpc = getAppConfig().rpc;
	if (isSolanaChain(chain)) {
		return rpc?.solanaUrl;
	}

	return rpc?.evmUrls?.find((entry) => entry.chain === chain)?.value;
};

export const getLatestBlockOrSlot = async (
	chain: ChainEnum,
): Promise<bigint> => {
	try {
		if (isCardanoChain(chain)) {
			return await getCardanoLatestSlot(chain);
		}

		const url = resolveRpcUrl(chain);
		if (!url) {
			const hint = isSolanaChain(chain)
				? 'Set SOLANA_RPC_URL.'
				: `Set EVM_RPC_URL_${chain.toUpperCase()}.`;
			throw new InternalServerErrorException(
				`RPC URL not configured for chain ${chain}. ${hint}`,
			);
		}

		if (isSolanaChain(chain)) {
			return await getSolanaLatestBlock(url);
		}
		return await getEvmLatestBlock(url);
	} catch (e) {
		Logger.error(`Failed to fetch latest block/slot for ${chain}: ${e}`);
		if (e instanceof InternalServerErrorException) {
			throw e;
		}
		throw new InternalServerErrorException(
			`Failed to fetch latest block for chain ${chain}`,
		);
	}
};
