import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	ValidateNested,
} from 'class-validator';
import { TokenNetworkEnum } from './tokenInfo.config';

export class TokenInfoDto {
	@IsNotEmpty()
	@IsInt()
	@ApiProperty({
		description: 'Bridge token ID this metadata applies to',
		example: 1,
	})
	tokenID: number;

	@IsString()
	@ApiProperty({
		description: 'Short name shown in the UI',
		example: 'AP3X',
	})
	label: string;

	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description:
			'Key of the icon asset (apex, eth, polygon, sei, solana, unknown). ' +
			'Unrecognized keys should fall back to the unknown icon.',
		example: 'apex',
	})
	icon: string;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description:
			'Hosted image to use instead of the bundled asset, for tokens whose icon is not in the frontend yet',
		example: 'https://cdn.apexfusion.org/tokens/ap3x.svg',
	})
	iconUrl?: string;
}

export class TokenInfosResponseDto {
	@IsNotEmpty()
	@IsEnum(TokenNetworkEnum)
	@ApiProperty({
		description: 'Network this instance serves the metadata for',
		enum: TokenNetworkEnum,
		enumName: 'TokenNetworkEnum',
		example: TokenNetworkEnum.Testnet,
	})
	network: TokenNetworkEnum;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => TokenInfoDto)
	@ApiProperty({
		description: 'Display metadata per bridge token ID',
		type: () => [TokenInfoDto],
	})
	tokens: TokenInfoDto[];

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => TokenInfoDto)
	@ApiProperty({
		description: 'Metadata to use for a token ID that is not in the list',
		type: () => TokenInfoDto,
	})
	unknownToken: TokenInfoDto;
}
