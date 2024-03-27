import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { NotSame } from 'src/decorators/notSame.decorator';

export enum ChainEnum {
	Prime = 'Prime',
	Vector = 'Vector',
}

export class CreateTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	receiverAddress: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	amount: number;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum })
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum })
	destinationChain: ChainEnum;
}

export class SignTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	privateKey: string;

	@IsNotEmpty()
	@ApiProperty()
	transaction: string;
}

export class SubmitTransactionDto {
	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum })
	chain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty()
	transaction: string;
}
