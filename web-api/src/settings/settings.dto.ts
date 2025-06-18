import { ApiProperty } from '@nestjs/swagger';
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
