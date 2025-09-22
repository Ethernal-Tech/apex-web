import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty } from 'class-validator';
import { PaginatedDto } from 'src/common/dto';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class BridgeTransactionDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Bridging transaction ID',
	})
	id: number;

	@IsNotEmpty()
	@ApiProperty({
		description:
			'Address that initiated the bridging transaction on the source chain',
	})
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Recipient addresses on the destination chain',
	})
	receiverAddresses: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Bridged amount',
	})
	amount: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Bridged native token amount',
	})
	nativeTokenAmount: string;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	originChain: ChainEnum;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@NotSame('originChain')
	@ApiProperty({
		description: 'Destination chain ID',
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	destinationChain: ChainEnum;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction hash on source chain',
	})
	sourceTxHash: string;

	@ApiProperty({
		description: 'Transaction hash on destination chain',
		nullable: true,
		required: false,
	})
	destinationTxHash?: string;

	@IsNotEmpty()
	@IsEnum(TransactionStatusEnum)
	@ApiProperty({
		description: 'Status of bridging request',
		enum: TransactionStatusEnum,
		enumName: 'TransactionStatusEnum',
	})
	status: TransactionStatusEnum;

	@IsNotEmpty()
	@IsDate()
	@ApiProperty({
		description: 'Transaction creation date',
	})
	createdAt: Date;

	@IsDate()
	@ApiProperty({
		description: 'Transaction finalization date',
		nullable: true,
		required: false,
	})
	finishedAt?: Date;

	@ApiProperty({
		description: 'Transaction is Layer Zero bridging',
	})
	isLayerZero: boolean;
}

export class BridgeTransactionFilterDto extends PaginatedDto {
	@IsNotEmpty()
	@ApiProperty({
		description:
			'Address that initiated the bridging transaction on the source chain',
	})
	senderAddress: string;

	@IsNotEmpty()
	@IsEnum(ChainEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	originChain: ChainEnum;

	@ApiProperty({
		description: 'Destination chain ID',
		nullable: true,
		required: false,
		enum: ChainEnum,
		enumName: 'ChainEnum',
	})
	destinationChain?: ChainEnum;

	@ApiProperty({
		description: 'Minimum amount of currency',
		nullable: true,
		required: false,
	})
	amountFrom?: string;

	@ApiProperty({
		description: 'Maximum amount of currency',
		nullable: true,
		required: false,
	})
	amountTo?: string;

	@ApiProperty({
		description: 'Minimum amount of native token',
		nullable: true,
		required: false,
	})
	nativeTokenAmountFrom?: string;

	@ApiProperty({
		description: 'Maximum amount of native token',
		nullable: true,
		required: false,
	})
	nativeTokenAmountTo?: string;

	@ApiProperty({
		description: 'Field by which the results should be sorted',
		nullable: true,
		required: false,
	})
	orderBy?: string;

	@ApiProperty({
		description: 'Sort direction',
		nullable: true,
		required: false,
	})
	order?: string;

	@ApiProperty({
		description: 'Receiver address on destination chain',
		nullable: true,
		required: false,
	})
	receiverAddress?: string;

	@ApiProperty({
		description: 'Retrieve transaction which are bridged with Reactor bridge',
		nullable: true,
		required: false,
	})
	onlyReactor?: boolean;
}

export class BridgeTransactionResponseDto {
	@ApiProperty({
		description: 'Array of bridging transactions',
		type: BridgeTransactionDto,
		isArray: true,
	})
	items: BridgeTransactionDto[];

	@ApiProperty({
		description: 'Current page number',
	})
	page: number;

	@ApiProperty({
		description: 'Number of items returned per page',
	})
	perPage: number;

	@ApiProperty({
		description: 'Total number of items',
	})
	total: number;
}
