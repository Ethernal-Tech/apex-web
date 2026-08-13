import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	ValidateNested,
} from 'class-validator';
import { ConfigNetworkEnum } from 'src/appConfig/configNetwork';
import { HEX_COLOR_PATTERN } from 'src/utils/colorUtils';

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
		description: 'Display metadata per chain id',
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
