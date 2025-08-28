import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsPositive } from 'class-validator';
import { ChainApexBridgeEnum } from 'src/common/enum';
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
		enumName: 'ChainEnum',
	})
	originChain: ChainApexBridgeEnum;

	@IsNotEmpty()
	@IsEnum(ChainApexBridgeEnum)
	@NotSame('originChain')
	@ApiProperty({
		description: 'Destination chain ID',
		enum: ChainApexBridgeEnum,
		enumName: 'ChainEnum',
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

	@IsNotEmpty()
	@ApiProperty({
		description:
			'True if the amount is specified in a native token; false if in a currency on source chain',
	})
	isNativeToken: boolean;
}

export class TransactionSubmittedDto {
	@IsNotEmpty()
	@IsEnum(ChainApexBridgeEnum)
	@ApiProperty({
		description: 'Source chain ID',
		enum: ChainApexBridgeEnum,
		enumName: 'ChainEnum',
	})
	originChain: ChainApexBridgeEnum;

	@IsNotEmpty()
	@IsEnum(ChainApexBridgeEnum)
	@NotSame('originChain')
	@ApiProperty({
		description: 'Destination chain ID',
		enum: ChainApexBridgeEnum,
		enumName: 'ChainEnum',
	})
	destinationChain: ChainApexBridgeEnum;

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
	bridgingFee: number;

	@ApiProperty({
		description: 'Indicates is fallback mechanism used',
	})
	isFallback: boolean;

	@IsNotEmpty()
	@ApiProperty({
		description: 'Amount of currency to be bridged, expressed in Lovelace',
	})
	amount: number;

	@ApiProperty({
		description: 'Amount of native token to be bridged',
		nullable: true,
		required: false,
	})
	nativeTokenAmount?: number;
}

export class CardanoTransactionFeeResponseDto {
	@IsPositive()
	@ApiProperty({
		description: 'Transaction fee on the source chain, expressed in Lovelace',
	})
	fee: number;

	@IsPositive()
	@ApiProperty({
		description:
			'Bridging fee for covering submission on the destination chain, expressed in Lovelace',
	})
	bridgingFee: number;
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
