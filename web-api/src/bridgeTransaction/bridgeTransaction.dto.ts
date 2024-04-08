import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class CreateBridgeTransactionDto {
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
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;
}

export class UpdateBridgeTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	id: number;

	@ApiProperty({
		enum: TransactionStatusEnum,
		enumName: 'TransactionStatusEnum',
	})
	status: TransactionStatusEnum;
}

export class BridgeTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	id: number;

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
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(TransactionStatusEnum)
	@ApiProperty({
		enum: TransactionStatusEnum,
		enumName: 'TransactionStatusEnum',
	})
	status: TransactionStatusEnum;

	@IsNotEmpty()
	@IsDate()
	@ApiProperty()
	createdAt: Date;

	@IsDate()
	@ApiProperty({ nullable: true })
	finishedAt?: Date;
}
