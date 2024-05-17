import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class CreateTransactionDto {
	@ApiHideProperty()
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	receiverAddress: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty()
	amount: number;

	@ApiHideProperty()
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
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
	@ApiHideProperty()
	chain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty()
	transaction: string;
}
