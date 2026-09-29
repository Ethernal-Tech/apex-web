import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TokenPriceDto } from './tokenPrice.dto';
import { TokenPriceService } from './tokenPrice.service';

@ApiTags('TokenPrice')
@Controller('tokenPrice')
export class TokenPriceController {
	constructor(private readonly tokenPriceService: TokenPriceService) {}

	@ApiOperation({
		summary: 'Get cached token prices',
		description:
			'Returns the USD prices cached by the token price cron job, refreshed every 10 minutes. ' +
			'One entry per bridge token ID, so a price can be joined onto amounts keyed by token ID or by ecosystem token name. ' +
			'Representations of the same asset repeat the price under their own ID - token IDs 2 (ADA) and 4 (xADA) are both priced as ADA.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'OK - Cached token prices.',
		type: TokenPriceDto,
		isArray: true,
	})
	@HttpCode(HttpStatus.OK)
	@Get()
	get(): TokenPriceDto[] {
		return this.tokenPriceService.getPricedTokens().map((token) => ({
			id: token.id,
			name: token.name,
			symbol: token.symbol,
			chains: token.chains,
			priceUsd: token.entry.priceUsd,
			source: token.entry.source,
			fetchedAt: token.entry.fetchedAt.toISOString(),
			stale: this.tokenPriceService.isStale(token.entry),
		}));
	}
}
