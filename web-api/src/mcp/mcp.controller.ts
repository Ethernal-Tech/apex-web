import {
	Controller,
	Delete,
	Get,
	Logger,
	Post,
	Req,
	Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';

/**
 * MCP endpoint (Streamable HTTP transport) for AI agents. Stateless: each POST
 * is a self-contained JSON-RPC exchange on a fresh server, so there are no
 * sessions to keep and any instance can serve any request.
 */
@ApiExcludeController()
@Controller('mcp')
export class McpController {
	constructor(private readonly mcpService: McpService) {}

	@Post()
	async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
		// The transport rejects clients that do not accept both JSON and SSE, but
		// it only ever answers with plain JSON here. Agents that follow llms.txt
		// with a generic HTTP tool often send neither, so accept them as well.
		req.headers.accept = 'application/json, text/event-stream';

		const server = this.mcpService.createServer();
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});
		res.on('close', () => {
			void transport.close();
			void server.close();
		});

		try {
			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
		} catch (e) {
			Logger.error(
				`MCP request failed: ${e}`,
				e instanceof Error ? e.stack : undefined,
			);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: { code: -32603, message: 'Internal server error' },
					id: null,
				});
			}
		}
	}

	// no sessions, so no server-initiated stream and nothing to terminate
	@Get()
	@Delete()
	methodNotAllowed(@Res() res: Response): void {
		res
			.status(405)
			.set('Allow', 'POST')
			.json({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Method not allowed' },
				id: null,
			});
	}
}
