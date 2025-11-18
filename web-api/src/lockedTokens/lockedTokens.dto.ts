import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';
import { TokenEnum } from 'src/common/enum';

export class LockedTokensDto {
	@ApiProperty({
		description: 'Per chain → token → address → amoumt.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				additionalProperties: { type: 'string' },
			},
		},
	})
	chains: {
		[chainName: string]: { [tokenName: string]: { [address: string]: string } };
	};

	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

export class LockedTokensResponse {
	@ApiProperty({
		description: 'Per chain → token → address → amoumt.',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: {
				type: 'object',
				additionalProperties: { type: 'string' },
			},
		},
	})
	@IsObject()
	@IsNotEmptyObject()
	chains!: {
		[chainName: string]: { [tokenName: string]: { [address: string]: string } };
	};
}

export class TransferredTokensResponse {
	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

export class TransferredTokensByDay {
	@ApiProperty({
		description: 'The date of the transaction or event (YYYY-MM-DD).',
		type: String,
		example: '2025-07-24',
		format: 'date',
	})
	date: Date;

	@ApiProperty({
		description: 'Mapping of total transfered tokens per chain for day',
		type: 'object',
		additionalProperties: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
	})
	totalTransferred: { [key: string]: { [innerKey: string]: string } };
}

export class TokenEnumSchemaHolderDto {
	@ApiProperty({
		description:
			'A sample property to hold the TokenEnum type for schema generation.',
		enum: TokenEnum,
		enumName: 'TokenEnum',
		example: TokenEnum.APEX,
	})
	token: TokenEnum;
}
