import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class BalanceResponseDto {
	@IsNotEmpty()
	@ApiProperty({
		type: Object,
		additionalProperties: { type: 'string' },
	})
	balance: { [key: string]: string };
}
