import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty } from 'class-validator';
import { PaginatedDto } from 'src/common/dto';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class BridgeTransactionDto {
	@IsNotEmpty()
	@ApiProperty()
	id: number;

	@IsNotEmpty()
	@ApiProperty()
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty()
	receiverAddresses: string;

	@IsNotEmpty()
	@ApiProperty()
	amount: string;

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
	sourceTxHash: string;

	@ApiProperty({ nullable: true, required: false })
	destinationTxHash?: string;

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
	@ApiProperty({ nullable: true, required: false })
	finishedAt?: Date;
}

export class BridgeTransactionFilterDto extends PaginatedDto {
	@IsNotEmpty()
	@ApiProperty()
	senderAddress: string;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@ApiProperty({
		nullable: true,
		required: false,
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	destinationChain?: ChainEnum;

	@ApiProperty({ nullable: true, required: false })
	amountFrom?: string;

	@ApiProperty({ nullable: true, required: false })
	amountTo?: string;

	@ApiProperty({ nullable: true, required: false })
	orderBy?: string;

	@ApiProperty({ nullable: true, required: false })
	order?: string;

	@ApiProperty({ nullable: true, required: false })
	receiverAddress?: string;
}

export class BridgeTransactionResponseDto {
	@ApiProperty({ type: BridgeTransactionDto, isArray: true })
	items: BridgeTransactionDto[];

	@ApiProperty()
	page: number;

	@ApiProperty()
	perPage: number;

	@ApiProperty()
	total: number;
}
