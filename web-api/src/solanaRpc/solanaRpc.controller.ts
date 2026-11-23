import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SolanaRpcService } from './solanaRpc.service';

@ApiTags('SolanaRpc')
@Controller('solanaRpc')
export class SolanaRpcController {
	constructor(private readonly solanaRpcService: SolanaRpcService) {}

	@ApiOperation({
		summary: 'Forward a Solana JSON-RPC request',
		description:
			'Forwards one JSON-RPC request to the configured Solana RPC node and returns its HTTP status and body unchanged. ' +
			'Allowed methods: getBalance, getTokenAccountsByOwner, getFeeForMessage, sendTransaction, getSignatureStatuses.',
	})
	@ApiBody({
		schema: {
			type: 'object',
			required: ['method'],
			properties: {
				jsonrpc: { type: 'string', example: '2.0' },
				id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
				method: { type: 'string', example: 'getBalance' },
				params: { type: 'array', items: {} },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'The Solana RPC node response body, as returned.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Not a single JSON-RPC request, or the method is not allowed.',
	})
	@ApiResponse({
		status: HttpStatus.BAD_GATEWAY,
		description: 'The Solana RPC node could not be reached.',
	})
	@ApiResponse({
		status: HttpStatus.SERVICE_UNAVAILABLE,
		description: 'SOLANA_RPC_URL is not configured.',
	})
	@Post()
	async forward(@Body() body: unknown, @Res() res: Response): Promise<void> {
		const { status, data } = await this.solanaRpcService.forward(body);
		res.status(status).json(data);
	}
}
