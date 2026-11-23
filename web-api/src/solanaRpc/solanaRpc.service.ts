import {
	BadGatewayException,
	BadRequestException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from 'src/appConfig/appConfig.service';

const REQUEST_TIMEOUT_MS = 15_000;

/** JSON-RPC methods the frontend calls; anything else is rejected. */
export const ALLOWED_SOLANA_RPC_METHODS: ReadonlySet<string> = new Set([
	'getBalance',
	'getTokenAccountsByOwner',
	'getFeeForMessage',
	'sendTransaction',
	'getSignatureStatuses',
]);

export type SolanaRpcForwardResult = {
	status: number;
	data: unknown;
};

type JsonRpcRequest = {
	id: string | number | null;
	method: string;
	params: unknown[];
};

function parseJsonRpcRequest(body: unknown): JsonRpcRequest {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		throw new BadRequestException('Body must be a single JSON-RPC request.');
	}

	const { id, method, params } = body as Record<string, unknown>;

	if (typeof method !== 'string' || !ALLOWED_SOLANA_RPC_METHODS.has(method)) {
		throw new BadRequestException(
			`Unsupported Solana RPC method: ${String(method)}`,
		);
	}
	if (params !== undefined && !Array.isArray(params)) {
		throw new BadRequestException('"params" must be an array.');
	}
	if (
		id !== undefined &&
		id !== null &&
		typeof id !== 'string' &&
		typeof id !== 'number'
	) {
		throw new BadRequestException('"id" must be a string or number.');
	}

	return { id: id ?? 1, method, params: params ?? [] };
}

@Injectable()
export class SolanaRpcService {
	constructor(private readonly appConfig: AppConfigService) {}

	/** Forwards one JSON-RPC request to SOLANA_RPC_URL and returns its status and body unchanged. */
	async forward(body: unknown): Promise<SolanaRpcForwardResult> {
		const request = parseJsonRpcRequest(body);
		const rpcUrl = this.appConfig.rpc?.solanaUrl?.trim();
		if (!rpcUrl) {
			throw new ServiceUnavailableException(
				'No Solana RPC URL configured. Set SOLANA_RPC_URL.',
			);
		}

		try {
			const response = await axios.post(
				rpcUrl,
				{ jsonrpc: '2.0', ...request },
				{
					headers: { 'Content-Type': 'application/json' },
					timeout: REQUEST_TIMEOUT_MS,
					// pass upstream errors (4xx/5xx) through to the caller as-is
					validateStatus: () => true,
				},
			);
			return { status: response.status, data: response.data };
		} catch (e) {
			Logger.error(
				`Solana RPC ${request.method} failed: ${e instanceof Error ? e.message : String(e)}`,
			);
			throw new BadGatewayException('Solana RPC request failed.');
		}
	}
}
