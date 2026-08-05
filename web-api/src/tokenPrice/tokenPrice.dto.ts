import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsArray,
	IsBoolean,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from 'class-validator';
import { PriceProviderEnum } from './tokenPrice.config';

export class TokenPriceDto {
	@IsOptional()
	@IsInt()
	@ApiPropertyOptional({
		description:
			'Bridge token ID this price applies to. Omitted for a tracked token the bridge settings do not know yet.',
		example: 4,
	})
	id?: number;

	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description:
			'Ecosystem token name of this token ID, as served in the settings. Falls back to the symbol when the token ID is unknown.',
		example: 'xADA',
	})
	name: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description:
			'Tracked token symbol the price is cached under. Shared by every representation of the same asset - ADA and xADA are both priced as ADA.',
		example: 'ADA',
	})
	symbol: string;

	@IsArray()
	@ApiProperty({
		description: 'Chains whose direction config defines this token ID',
		type: [String],
		example: ['nexus', 'vector'],
	})
	chains: string[];

	@IsNotEmpty()
	@IsNumber()
	@Min(0)
	@ApiProperty({ description: 'Last cached USD price', example: 0.0312 })
	priceUsd: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Provider the cached price came from',
		enum: PriceProviderEnum,
		enumName: 'PriceProviderEnum',
		example: PriceProviderEnum.CoinGecko,
	})
	source: PriceProviderEnum;

	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description: 'When the price was fetched (ISO 8601)',
		example: '2026-08-04T12:10:00.000Z',
	})
	fetchedAt: string;

	@IsBoolean()
	@ApiProperty({
		description:
			'True when the price is older than the configured staleness threshold',
		example: false,
	})
	stale: boolean;
}
