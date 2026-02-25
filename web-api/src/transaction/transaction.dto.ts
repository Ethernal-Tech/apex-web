import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class CreateTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	senderAddress: string;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty()
	destinationAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	amount: string;

	@ApiProperty({ nullable: true })
	bridgingFee?: string;

	@ApiProperty({ nullable: true })
	utxoCacheKey?: string;
}

export class TransactionSubmittedDto {
	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty()
	originTxHash: string;

	@IsNotEmpty()
	@ApiProperty()
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	@IsArray()
	receiverAddrs: string[];

	@IsNotEmpty()
	@ApiProperty()
	amount: string;

	@IsNotEmpty()
	@ApiProperty()
	txRaw: string;

	@ApiProperty()
	isFallback: boolean;
}

export class CreateCardanoTransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	txRaw: string;

	@IsNotEmpty()
	@ApiProperty()
	txHash: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	bridgingFee: string;

	@ApiProperty()
	isFallback: boolean;
}

export class CardanoTransactionFeeResponseDto {
	@IsPositive()
	@ApiProperty()
	fee: string;
}

export class CreateEthTransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	from: string;

	@IsNotEmpty()
	@ApiProperty()
	to: string;

	@ApiProperty({ nullable: true, required: false })
	value?: string;

	@IsNotEmpty()
	@ApiProperty()
	data: string;

	@IsNotEmpty()
	@ApiProperty()
	bridgingFee: string;

	@ApiProperty()
	isFallback: boolean;
}

export class ErrorResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	err: string;
}

export class TransactionUpdateDto {
	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	originChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction hash on source chain',
	})
	originTxHash: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction raw data on source chain',
	})
	txRaw: string;
}

export class TransactionActivateDeleteDto {
	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	originChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction hash on source chain',
	})
	originTxHash: string;
}
