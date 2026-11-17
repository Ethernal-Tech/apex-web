import { HttpException, Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import {
	BridgeIntentService,
	chainTypeOf,
} from 'src/bridgeIntent/bridgeIntent.service';
import { BridgingModeEnum, ChainEnum } from 'src/common/enum';
import { SettingsService } from 'src/settings/settings.service';
import { TokenInfosRegistry } from 'src/tokenInfo/tokenInfos.registry';
import { getBridgingMode } from 'src/utils/chainUtils';

const SERVER_INSTRUCTIONS = `Skyline Bridge moves funds between blockchains (Cardano-style UTXO chains, EVM chains and Solana).
You never hold or sign with the user's keys. To bridge on behalf of the user:
1. Call get_bridge_routes to find the source chain, destination chain and source tokenID for the request.
2. Call create_bridge_intent with the amount and the receiver address on the destination chain. Never guess the receiver address - ask the user if it is not known.
3. Give the returned signingUrl to the user. They open it in a desktop browser with their wallet extension, review the transfer and sign it. Mobile wallets are not supported.
4. Call get_bridge_intent_status to follow the transfer until it reaches a final state (success, failed, refunded) or expires.
Minimum/maximum amounts, fees and the user's balance are checked on the signing page.`;

type RouteToken = {
	tokenID: number;
	symbol: string;
	destinationTokenID: number;
	destinationSymbol: string;
	bridgingMode: BridgingModeEnum;
};

type Route = {
	sourceChain: string;
	sourceChainType: string;
	destinationChain: string;
	destinationChainType: string;
	tokens: RouteToken[];
};

const jsonResult = (value: unknown): CallToolResult => ({
	content: [{ type: 'text', text: JSON.stringify(value, undefined, 2) }],
});

const errorResult = (e: unknown): CallToolResult => {
	let message = e instanceof Error ? e.message : String(e);
	if (e instanceof HttpException) {
		const response = e.getResponse();
		if (typeof response === 'object' && response && 'message' in response) {
			message = String((response as { message: unknown }).message);
		}
	}

	return { content: [{ type: 'text', text: message }], isError: true };
};

@Injectable()
export class McpService {
	constructor(
		private readonly settingsService: SettingsService,
		private readonly bridgeIntentService: BridgeIntentService,
		private readonly tokenInfos: TokenInfosRegistry,
		private readonly appConfig: AppConfigService,
	) {}

	/** A server per request - the endpoint is stateless */
	createServer(): McpServer {
		const server = new McpServer(
			{ name: 'skyline-bridge', version: '1.0.0' },
			{ instructions: SERVER_INSTRUCTIONS },
		);

		server.registerTool(
			'get_bridge_routes',
			{
				title: 'Get bridge routes',
				description:
					'Lists the bridging routes currently supported: source chain, destination chain and the tokens (with tokenID) that can be sent over each. Optionally filtered by chain IDs.',
				inputSchema: {
					sourceChain: z
						.string()
						.optional()
						.describe('Source chain ID, e.g. "prime"'),
					destinationChain: z
						.string()
						.optional()
						.describe('Destination chain ID, e.g. "cardano"'),
				},
				annotations: { readOnlyHint: true, openWorldHint: false },
			},
			({ sourceChain, destinationChain }) => {
				try {
					return jsonResult({
						network: this.appConfig.app.isMainnet ? 'mainnet' : 'testnet',
						routes: this.getRoutes(
							sourceChain?.trim().toLowerCase(),
							destinationChain?.trim().toLowerCase(),
						),
					});
				} catch (e) {
					return errorResult(e);
				}
			},
		);

		server.registerTool(
			'create_bridge_intent',
			{
				title: 'Create bridge intent',
				description:
					'Prepares a bridging transfer for the user to sign. Returns a signingUrl the user must open in a desktop browser with their wallet extension to review and sign the transfer, and an intentId to follow it with get_bridge_intent_status. The intent expires if not signed in time. Nothing is sent until the user signs.',
				inputSchema: {
					sourceChain: z.string().describe('Source chain ID, e.g. "prime"'),
					destinationChain: z
						.string()
						.describe('Destination chain ID, e.g. "cardano"'),
					tokenID: z
						.number()
						.int()
						.describe('Source token ID, as listed by get_bridge_routes'),
					amount: z
						.string()
						.describe(
							'Amount to send in whole token units as a decimal string with at most 6 decimals, e.g. "12.5"',
						),
					destinationAddress: z
						.string()
						.describe('Receiver address on the destination chain'),
				},
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: false,
				},
			},
			async (input) => {
				try {
					const created = await this.bridgeIntentService.create({
						originChain: input.sourceChain,
						destinationChain: input.destinationChain,
						tokenID: input.tokenID,
						amount: input.amount,
						destinationAddress: input.destinationAddress,
					});
					const { intent } = created;

					return jsonResult({
						intentId: intent.id,
						signingUrl: created.signingUrl,
						expiresAt: intent.expiresAt,
						transfer: {
							sourceChain: intent.originChain,
							destinationChain: intent.destinationChain,
							tokenID: intent.tokenID,
							symbol: this.tokenSymbol(intent.tokenID),
							amount: intent.amount,
							destinationAddress: intent.destinationAddress,
							bridgingMode: created.bridgingMode,
						},
						nextStep:
							'Give the signingUrl to the user to sign in a desktop browser, then poll get_bridge_intent_status.',
					});
				} catch (e) {
					return errorResult(e);
				}
			},
		);

		server.registerTool(
			'get_bridge_intent_status',
			{
				title: 'Get bridge intent status',
				description:
					'Returns the state of a bridge intent: awaiting_signature, expired, submitted (signed, not yet observed by the bridge), pending (bridging in progress), refunding, or the final success, failed and refunded. Bridging usually takes a few minutes, so poll at intervals of 30 seconds or more.',
				inputSchema: {
					intentId: z
						.string()
						.describe('intentId returned by create_bridge_intent'),
				},
				annotations: { readOnlyHint: true, openWorldHint: false },
			},
			async ({ intentId }) => {
				try {
					const status = await this.bridgeIntentService.getStatus(
						intentId.trim(),
					);
					return jsonResult({
						...status,
						symbol: this.tokenSymbol(status.tokenID),
					});
				} catch (e) {
					return errorResult(e);
				}
			},
		);

		return server;
	}

	private getRoutes(sourceChain?: string, destinationChain?: string): Route[] {
		const settings = this.settingsService.SettingsResponse;
		const enabledChains = new Set(settings.enabledChains);
		const routes: Route[] = [];

		for (const [src, config] of Object.entries(settings.directionConfig)) {
			if (!enabledChains.has(src) || (sourceChain && src !== sourceChain)) {
				continue;
			}

			for (const [dst, tokenPairs] of Object.entries(config.destChain || {})) {
				if (
					!enabledChains.has(dst) ||
					(destinationChain && dst !== destinationChain)
				) {
					continue;
				}

				const tokens: RouteToken[] = [];
				for (const pair of tokenPairs) {
					const bridgingMode = getBridgingMode(
						src as ChainEnum,
						dst as ChainEnum,
						pair.srcTokenID,
						settings,
					);
					if (!bridgingMode) {
						continue;
					}

					tokens.push({
						tokenID: pair.srcTokenID,
						symbol: this.tokenSymbol(pair.srcTokenID),
						destinationTokenID: pair.dstTokenID,
						destinationSymbol: this.tokenSymbol(pair.dstTokenID),
						bridgingMode,
					});
				}

				if (tokens.length > 0) {
					routes.push({
						sourceChain: src,
						sourceChainType: chainTypeOf(src as ChainEnum),
						destinationChain: dst,
						destinationChainType: chainTypeOf(dst as ChainEnum),
						tokens,
					});
				}
			}
		}

		return routes;
	}

	private tokenSymbol(tokenID: number): string {
		const label = this.tokenInfos
			.getTokens()
			.find((x) => x.tokenID === tokenID)?.label;
		if (label) {
			return label;
		}

		return (
			this.settingsService.SettingsResponse.ecosystemTokens.find(
				(x) => x.id === tokenID,
			)?.name ?? `token ${tokenID}`
		);
	}
}
