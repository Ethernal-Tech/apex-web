import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class CreateTransactionReceiverDto {
	@IsNotEmpty()
	@ApiProperty()
	address: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	amount: number;
}

export class CreateTransactionDto {
	@ApiHideProperty()
	senderAddress: string;

	@ApiHideProperty()
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@Type(() => Array<CreateTransactionReceiverDto>)
	@IsNotEmpty()
	@ApiProperty({ isArray: true, type: CreateTransactionReceiverDto })
	@IsArray({ each: true })
	receivers: CreateTransactionReceiverDto[];

	@ApiProperty({ nullable: true })
	bridgingFee?: number;
}

export class SignTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	signingKeyHex: string;

	@IsNotEmpty()
	@ApiProperty()
	txRaw: string;

	@IsNotEmpty()
	@ApiProperty()
	txHash: string;
}

export class TransactionSubmittedDto {
	@ApiHideProperty()
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty()
	originTxHash: string;

	@ApiHideProperty()
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	@IsArray()
	receiverAddrs: string[];

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	amount: number;
}

export class SubmitTransactionDto extends TransactionSubmittedDto {
	@IsNotEmpty()
	@ApiProperty()
	signedTxRaw: string;
}

export class SubmitTransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	txId: string;
}

export class TransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	txRaw: string;

	@IsNotEmpty()
	@ApiProperty()
	txHash: string;
}

export class CreateTransactionResponseDto extends TransactionResponseDto {
	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	bridgingFee: number;
}

export class ErrorResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	err: string;
}
