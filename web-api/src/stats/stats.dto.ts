import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class LandingStatsDto {
	@IsNotEmpty()
	@IsInt()
	@Min(0)
	@ApiProperty({
		description: 'Total number of bridging transactions in the database',
		example: 1240000,
	})
	bridgingTransactions: number;
}
