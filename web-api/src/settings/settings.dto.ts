import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsNotEmpty,
	IsObject,
	IsPositive,
	ValidateNested,
} from 'class-validator';

export class BridgingSettingsDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minChainFeeForBridging: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minOperationFee: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		type: Object,
		additionalProperties: { type: 'number' },
	})
	minUtxoChainValue: { [key: string]: number };

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	minValueToBridge: number;

	@IsNotEmpty()
	@ApiProperty()
	maxAmountAllowedToBridge: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	maxReceiversPerBridgingRequest: number;
}

export class NativeTokenDto {
	@IsNotEmpty()
	@ApiProperty()
	dstChainID: string;

	@IsNotEmpty()
	@ApiProperty()
	tokenName: string;
}

@ApiExtraModels(NativeTokenDto)
export class SettingsResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	runMode: string;

	@IsNotEmpty()
	@IsObject()
	@ApiProperty({
		type: Object,
		additionalProperties: {
			type: 'array',
			items: { $ref: getSchemaPath(NativeTokenDto) },
		},
	})
	cardanoChainsNativeTokens: {
		[key: string]: NativeTokenDto[];
	};

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => BridgingSettingsDto)
	@ApiProperty({ type: BridgingSettingsDto })
	bridgingSettings: BridgingSettingsDto;

	@IsNotEmpty()
	@ApiProperty()
	enabledChains: string[];
}
