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

export class BridgeTransactionPaginationDto {
	@ApiProperty({ nullable: true })
	page: number;

	@ApiProperty({ nullable: true })
	perPage: number;
}

export class BridgeTransactionFilterDto extends BridgeTransactionPaginationDto {
	@ApiProperty({ nullable: true })
	destinationChain: ChainEnum;

	@ApiProperty({ nullable: true })
	receiverAddress: string;

	@ApiProperty({ nullable: true })
	amountFrom: number;

	@ApiProperty({ nullable: true })
	amountTo: number;

	@ApiProperty({ nullable: true })
	orderBy: string;

	@ApiProperty({ nullable: true })
	order: string;
}

export class BridgeTransactionResponseDto {
	@ApiProperty({ type: BridgeTransactionDto, isArray: true })
	entities: BridgeTransactionDto[]

	@ApiProperty()
	page: number

	@ApiProperty()
	perPage: number

	@ApiProperty()
	total: number
}