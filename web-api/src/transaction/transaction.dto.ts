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
	operationFee?: string;

	@ApiProperty({ nullable: true })
	utxoCacheKey?: string;

	@IsNotEmpty()
	@ApiProperty()
	isNativeToken: boolean;
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
	nativeTokenAmount: string;

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
	bridgingFee: number;

	@ApiProperty()
	isFallback: boolean;

	@IsNotEmpty()
	@ApiProperty()
	amount: number;

	@ApiProperty({ nullable: true })
	nativeTokenAmount?: number;
}

export class CardanoTransactionFeeResponseDto {
	@IsPositive()
	@ApiProperty()
	fee: number;

	@IsPositive()
	@ApiProperty()
	bridgingFee: number;
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
