import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainApexBridgeEnum, ChainEnum } from 'src/common/enum';
import { NotSame } from 'src/decorators/notSame.decorator';

export class CreateTransactionDto {
	@IsNotEmpty()
	@ApiProperty({
		description:
			'Address that initiates the bridging request on the source chain',
	})
	senderAddress: string;

	@IsNotEmpty()
	@IsEnum(ChainApexBridgeEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainApexBridgeEnum,
		enumName: 'ChainApexBridgeEnum',
	})
	originChain: ChainApexBridgeEnum;

	@IsNotEmpty()
	@IsEnum(ChainApexBridgeEnum)
	@NotSame('originChain')
	@ApiProperty({
		description: 'Destination chain ID',
		enum: ChainApexBridgeEnum,
		enumName: 'ChainApexBridgeEnum',
	})
	destinationChain: ChainApexBridgeEnum;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Receiver address on destination chain',
	})
	destinationAddress: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Amount to be bridged',
	})
	amount: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'id of the token',
	})
	tokenID: number;

	@ApiProperty({
		description:
			'Fee covering the submission of the transaction on the destination chain, expressed in Lovelace',
		nullable: true,
		required: false,
	})
	bridgingFee?: string;

	@ApiProperty({
		description:
			'Fee covering the operational cost of processing the bridging request, expressed in Lovelace',
		nullable: true,
		required: false,
	})
	operationFee?: string;

	@ApiProperty({
		description: 'Key used to enable caching of spent UTXOs',
		nullable: true,
		required: false,
	})
	utxoCacheKey?: string;
}

export class TransactionSubmittedDto {
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
	originTxHash: string;

	@IsNotEmpty()
	@ApiProperty({
		description:
			'Address that initiated the bridging request on the source chain',
	})
	senderAddress: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Recipient addresses on the destination chain',
	})
	@IsArray()
	receiverAddrs: string[];

	@IsNotEmpty()
	@ApiProperty({
		description: 'Amount of currency to be bridged, including bridging fee',
	})
	amount: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Amount of native token to be bridged',
	})
	nativeTokenAmount: string;

	@ApiProperty({
		description: 'Token ID',
	})
	tokenID: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction raw data on source chain',
	})
	txRaw: string;

	@ApiProperty({
		description: 'Indicates is fallback mechanism used',
	})
	isFallback: boolean;

	@ApiProperty({
		description: 'Indicates if Layer Zero bridging is used',
	})
	isLayerZero: boolean;
}

export class CreateCardanoTransactionResponseTokenAmountDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'ID of the token',
	})
	tokenID: number;

	@IsNotEmpty()
	@ApiProperty({
		description: 'amount of the token',
	})
	amount: string;
}

export class CreateCardanoTransactionResponseDto {
	@IsNotEmpty()
	@ApiProperty({
		description: 'Raw transaction data, encoded as a hexadecimal string',
	})
	txRaw: string;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Transaction hash',
	})
	txHash: string;

	@IsNotEmpty()
	@IsPositive()
	@ApiProperty({
		description:
			'Bridging fee for covering submission on the destination chain, expressed in Lovelace',
	})
	bridgingFee: string;

	@ApiProperty({
		description: 'Indicates is fallback mechanism used',
	})
	isFallback: boolean;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Amount of currency to be bridged, expressed in Lovelace',
	})
	amount: string;

	@ApiProperty({
		description: 'Amounts of tokens to be bridged',
		nullable: true,
		required: false,
		isArray: true,
		type: CreateCardanoTransactionResponseTokenAmountDto,
	})
	nativeTokenAmount?: CreateCardanoTransactionResponseTokenAmountDto[];
}

export class CardanoTransactionFeeResponseDto {
	@IsPositive()
	@ApiProperty({
		description: 'Transaction fee on the source chain, expressed in Lovelace',
	})
	fee: string;

	@IsPositive()
	@ApiProperty({
		description:
			'Bridging fee for covering submission on the destination chain, expressed in Lovelace',
	})
	bridgingFee: string;
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
