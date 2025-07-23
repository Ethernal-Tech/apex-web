import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPositive } from 'class-validator';

export class LockedTokensDto {
	@ApiProperty({
		description: 'Mapping of chains to their locked tokens by token type',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	chains: { [key: string]: { [innerKey: string]: string } };

	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransfered: { [key: string]: { [innerKey: string]: string } };
}

export class LockedTokensResponse {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description: 'For each chain, the number of locked tokens',
		type: Object,
		additionalProperties: { type: 'string' },
	})
	chains: { [key: string]: { [innerKey: string]: string } };
}
