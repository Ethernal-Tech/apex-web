import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPositive } from 'class-validator';

export class SettingsResponseDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	minChainFeeForBridging: Map<string, number>;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	minUtxoChainValue: Map<string, number>;

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
