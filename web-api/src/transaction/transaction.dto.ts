import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { BridgeTransactionDto } from 'src/bridgeTransaction/bridgeTransaction.dto';
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

export class SubmitCardanoTransactionDto extends TransactionSubmittedDto {
	@IsNotEmpty()
	@ApiProperty()
	signedTxRaw: string;
}

export class SubmitCardanoTransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty()
	txHash: string;

	@ApiProperty({ nullable: true })
	bridgeTx?: BridgeTransactionDto;
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

	@IsPositive()
	@ApiProperty()
	txFee: number;

	@ApiProperty()
	isFallback: boolean;
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
