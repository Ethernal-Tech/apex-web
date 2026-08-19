import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	ValidateNested,
} from 'class-validator';
import { ConfigNetworkEnum } from 'src/appConfig/configNetwork';
import { HEX_COLOR_PATTERN } from 'src/utils/colorUtils';

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
			'File name of an icon served by this API under /icons/tokens/. A name with ' +
			"no file behind it falls back to the UI's bundled unknown icon.",
		example: 'apex.svg',
	})
	icon: string;

	@IsOptional()
	@IsString()
	@ApiPropertyOptional({
		description:
			'Absolute URL of an icon hosted elsewhere, loaded directly by the browser. ' +
			'Wins over "icon". Must point straight at an image.',
		example: 'https://cdn.apexfusion.org/tokens/ap3x.svg',
	})
	iconUrl?: string;

	@IsOptional()
	@IsString()
	@Matches(HEX_COLOR_PATTERN)
	@ApiPropertyOptional({
		description:
			'Accent color of the token in the UI (legend dots, chart series), as a hex ' +
			'string. Absent when the config sets none - the UI then uses its default accent.',
		example: '#3B92FF',
	})
	color?: string;
}

export class TokenInfosResponseDto {
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
