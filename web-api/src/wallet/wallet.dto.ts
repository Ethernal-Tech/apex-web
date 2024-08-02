import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class BalanceResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	balance: string;
}
