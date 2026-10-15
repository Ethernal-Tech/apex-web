import { ApiProperty } from '@nestjs/swagger';

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
		example: 20,
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
