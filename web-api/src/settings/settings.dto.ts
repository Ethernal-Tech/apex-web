import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsBoolean,
	IsNotEmpty,
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

	@IsNotEmpty()
	@ApiProperty({
		type: Object,
		additionalProperties: {
			type: 'array',
			items: { type: 'string' },
		},
	})
	allowedDirections: { [key: string]: string[] };
}

export class SettingsResponseDto {
	@IsNotEmpty()
	@ValidateNested()
	@Type(() => BridgingSettingsDto)
	@ApiProperty({ type: BridgingSettingsDto })
	bridgingSettings: BridgingSettingsDto;

	@IsNotEmpty()
	@ApiProperty()
	enabledChains: string[];
}

export class ValidatorChangeDto {
	@IsNotEmpty()
	@IsBoolean()
	@ApiProperty({
		description:
			'Indicates whether the validator set change is currently in progress.',
	})
	inProgress: boolean;
}
