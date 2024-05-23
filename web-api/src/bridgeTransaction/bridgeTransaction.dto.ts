import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
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
	@ApiProperty({ nullable: true, required: false })
	finishedAt?: Date;
}

export class BridgeTransactionFilterDto extends PaginatedDto {
	@ApiHideProperty()
	senderAddress: string;

	@ApiHideProperty()
	originChain: ChainEnum;

	@ApiProperty({
		nullable: true,
		required: false,
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	destinationChain?: ChainEnum;

	@ApiProperty({ nullable: true, required: false })
	amountFrom?: number;

	@ApiProperty({ nullable: true, required: false })
	amountTo?: number;

	@ApiProperty({ nullable: true, required: false })
	orderBy?: string;

	@ApiProperty({ nullable: true, required: false })
	order?: string;
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
