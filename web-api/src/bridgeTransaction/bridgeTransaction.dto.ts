import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty } from 'class-validator';
import { PaginatedDto } from 'src/common/dto';
import { ChainExtendedEnum, TransactionStatusEnum } from 'src/common/enum';
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
	@IsEnum(ChainExtendedEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainExtendedEnum,
		enumName: 'ChainExtendedEnum',
	})
	originChain: ChainExtendedEnum;

	@IsNotEmpty()
	@IsEnum(ChainExtendedEnum)
	@NotSame('originChain')
	@ApiProperty({
		description: 'Destination chain ID',
		enum: ChainExtendedEnum,
		enumName: 'ChainExtendedEnum',
	})
	destinationChain: ChainExtendedEnum;

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
	@IsEnum(ChainExtendedEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainExtendedEnum,
		enumName: 'ChainExtendedEnum',
	})
	originChain: ChainExtendedEnum;

	@ApiProperty({
		description: 'Destination chain ID',
		nullable: true,
		required: false,
		enum: ChainExtendedEnum,
		enumName: 'ChainExtendedEnum',
	})
	destinationChain?: ChainExtendedEnum;

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

export class LayerZeroTransactionDto {
	@ApiProperty({
		description: 'Source chain name where the OFT transfer originates',
		type: LayerZeroTransactionDto,
		required: true
	})
	srcChainName: string;

	@ApiProperty({
		description: 'Destination chain name where the OFT will be received',
		type: LayerZeroTransactionDto,
		required: true
	})
	dstChainName: string;

	@ApiProperty({
		description: 'Address of the OFT contract on the source chain',
		type: LayerZeroTransactionDto,
		required: true
	})
	oftAddress: string;

	@ApiProperty({
		description: 'Amount to transfer in the smallest unit (wei/satoshi equivalent)',
		type: LayerZeroTransactionDto,
		required: true
	})
	amount: string;

	@ApiProperty({
		description: 'Address of the sender wallet',
		type: LayerZeroTransactionDto,
		required: true
	})
	from: string;

	@ApiProperty({
		description: 'Address of the recipient wallet (EVM hex or Solana base58)',
		type: LayerZeroTransactionDto,
		required: true
	})
	to: string;

	@ApiProperty({
		description: 'Whether to validate balances before creating transaction',
		type: LayerZeroTransactionDto,
		default: false,
		required: false
	})
	validate: boolean;

	@ApiProperty({
		description: 'Structured LayerZero execution options as JSON string. EXECUTOR OPTIONS: - lzReceive: Set gas limit and optional native drop for lzReceive execution - nativeDrops: Array of native token drops to specific addresses - composeOptions: Array of compose message execution settings with gas and native drop All numeric values for gas limits and native drops should be strings or numbers. Native drop amounts are in wei (e.g., "1000000000000000" = 0.001 ETH).',
		type: LayerZeroTransactionDto,
		required: false
	})
	options: string;
	
	@ApiProperty({
		description: 'Compose message for advanced OFT operations (hex encoded)',
		type: LayerZeroTransactionDto,
		required: false
	})
	composeMsg: string;

	@ApiProperty({
		description: 'OFT command for advanced operations (hex encoded)',
		type: LayerZeroTransactionDto,
		required: false
	})
	oftCmd: string;
}