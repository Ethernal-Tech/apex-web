import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPositive } from 'class-validator';

export class SettingsResponseDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	minFeeForBridging: number;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	minUtxoValue: number;

	@IsNotEmpty()
	@ApiProperty()
	maxAmountAllowedToBridge: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	maxReceiversPerBridgingRequest: number;
}
