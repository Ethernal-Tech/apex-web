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

export class BridgingDurationDto {
	@ApiProperty({ description: 'Source chain ID' })
	originChain: string;

	@ApiProperty({ description: 'Destination chain ID' })
	destinationChain: string;

	@ApiProperty({
		description:
			'Median duration of successful bridging transactions in this direction, in seconds',
		example: 420,
	})
	medianSeconds: number;

	@ApiProperty({
		description:
			'90th percentile duration of successful bridging transactions in this direction, in seconds',
		example: 780,
	})
	p90Seconds: number;

	@ApiProperty({
		description: 'Number of transactions the durations are calculated from',
		example: 120,
	})
	sampleCount: number;
}

export class BridgingDurationsDto {
	@ApiProperty({
		description:
			'Durations per direction, measured from its latest finished bridging transactions. Directions without enough recent transactions are omitted',
		type: BridgingDurationDto,
		isArray: true,
	})
	directions: BridgingDurationDto[];

	@ApiProperty({ description: 'When the durations were calculated' })
	calculatedAt: Date;
}
