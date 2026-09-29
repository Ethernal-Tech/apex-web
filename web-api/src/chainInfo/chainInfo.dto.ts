import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Matches,
	ValidateNested,
} from 'class-validator';
import { ConfigNetworkEnum } from 'src/appConfig/configNetwork';
import { HEX_COLOR_PATTERN } from 'src/utils/colorUtils';
import { CHAIN_CATEGORIES, ChainCategory } from './chainInfo.config';

export class ChainInfoDto {
	@IsString()
	@ApiProperty({
		description: 'Chain id this metadata applies to, as used by enabledChains',
		example: 'prime',
	})
	chain: string;

	@IsNotEmpty()
	@IsString()
	@Matches(HEX_COLOR_PATTERN)
	@ApiProperty({
		description:
			'Accent color of the chain in the UI (chart segments, chain labels), as a hex string',
		example: '#3B92FF',
	})
	color: string;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description:
			'Name the UI shows for the chain. Absent when the config sets none - the ' +
			'UI then capitalizes the chain id.',
		example: 'Prime',
	})
	label?: string;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description:
			'File name of a logo served by this API under /icons/chains/. A name with ' +
			"no file behind it falls back to the UI's bundled unknown logo.",
		example: 'prime.svg',
	})
	icon?: string;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description:
			'Absolute URL of a logo hosted elsewhere, loaded directly by the browser. ' +
			'Wins over "icon". Must point straight at an image.',
		example: 'https://cdn.example.com/chains/prime.png',
	})
	iconUrl?: string;

	@IsOptional()
	@IsNumber()
	@ApiPropertyOptional({
		description:
			'Where the chain sits in every chain list the UI draws. Lower comes ' +
			'first; chains without one sort last.',
		example: 1,
	})
	order?: number;

	@IsOptional()
	@IsEnum(CHAIN_CATEGORIES)
	@ApiPropertyOptional({
		description:
			'Chain family, picking the audit tab and the bridge network filter. ' +
			'Defaults to "evm" in the UI.',
		enum: CHAIN_CATEGORIES,
		example: 'utxo',
	})
	category?: ChainCategory;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description: "Ticker of the chain's native currency, shown next to amounts",
		example: 'AP3X',
	})
	symbol?: string;

	@IsOptional()
	@IsBoolean()
	@ApiPropertyOptional({
		description: 'True for an Apex Fusion chain, which the UI can filter on',
		example: true,
	})
	apexFusion?: boolean;
}

export class ChainInfosResponseDto {
	@IsNotEmpty()
	@IsEnum(ConfigNetworkEnum)
	@ApiProperty({
		description: 'Network this instance serves the metadata for',
		enum: ConfigNetworkEnum,
		enumName: 'ConfigNetworkEnum',
		example: ConfigNetworkEnum.Testnet,
	})
	network: ConfigNetworkEnum;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ChainInfoDto)
	@ApiProperty({
		description:
			'Display metadata per chain id. A chain the UI is asked to draw but ' +
			'this list omits is styled from unknownChain plus the UI defaults.',
		type: () => [ChainInfoDto],
	})
	chains: ChainInfoDto[];

	@IsOptional()
	@ValidateNested()
	@Type(() => ChainInfoDto)
	@ApiPropertyOptional({
		description:
			'Metadata to use for a chain that is not in the list. Absent when the ' +
			'config sets none - the UI then uses its own default accent. Its "chain" is empty.',
		type: () => ChainInfoDto,
	})
	unknownChain?: ChainInfoDto;
}
