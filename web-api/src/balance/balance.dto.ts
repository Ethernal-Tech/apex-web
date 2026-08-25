import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChainEnum } from 'src/common/enum';

export class BalanceTokenDto {
	@ApiProperty({
		description:
			'Token identifier on the chain: ERC-20 contract, Solana mint, or Cardano asset unit (policy+name).',
	})
	unit: string;

	@ApiProperty({
		description:
			'Balance in the token smallest unit (wei / lamports / quantity).',
	})
	amount: string;
}

export class AddressBalanceDto {
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	chain: ChainEnum;

	@ApiProperty()
	address: string;

	@ApiProperty({
		description:
			'Native balance in the chain smallest unit (wei / lamports / lovelace).',
	})
	amount: string;

	@ApiProperty({ type: [BalanceTokenDto] })
	tokens: BalanceTokenDto[];
}

/** Documented for Swagger only - query params are read via @Query. */
export class AddressBalanceQueryDocs {
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	chain: ChainEnum;

	@ApiProperty({ description: 'Wallet / account address on that chain.' })
	address: string;

	@ApiPropertyOptional({
		description:
			'Optional comma-separated token ids to include. ' +
			'EVM: ERC-20 contracts. Solana: mint addresses (omit = all SPL). ' +
			'Cardano: ignored (all assets on the address are returned).',
	})
	tokens?: string;
}
