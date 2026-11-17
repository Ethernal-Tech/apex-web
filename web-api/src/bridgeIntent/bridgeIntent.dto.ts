import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';

export enum BridgeIntentStateEnum {
	/** Created, waiting for the user to open the link and sign */
	AwaitingSignature = 'awaiting_signature',
	/** Nobody signed it before it expired */
	Expired = 'expired',
	/** Signed and submitted to the source chain, not yet observed by the bridge */
	Submitted = 'submitted',
	/** Observed by the bridge, funds on their way to the destination chain */
	Pending = 'pending',
	Success = 'success',
	Failed = 'failed',
	Refunding = 'refunding',
	Refunded = 'refunded',
}

export class BridgeIntentDto {
	@ApiProperty()
	id: string;

	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@ApiProperty({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@ApiProperty({ description: 'Source token ID' })
	tokenID: number;

	@ApiProperty({
		description: 'Human-readable amount, in the units shown by the bridge form',
	})
	amount: string;

	@ApiProperty({ description: 'Receiver address on the destination chain' })
	destinationAddress: string;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	expiresAt: Date;

	@ApiProperty({
		description: 'Source chain tx hash, set once the user signed the transfer',
		nullable: true,
		required: false,
	})
	txHash?: string;

	@ApiProperty({
		enum: BridgeIntentStateEnum,
		enumName: 'BridgeIntentStateEnum',
		description:
			'awaiting_signature, expired or submitted - the bridging progress afterwards is reported by the bridge transaction itself',
	})
	state: BridgeIntentStateEnum;
}

export class SubmitBridgeIntentDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(128)
	@ApiProperty({ description: 'Source chain tx hash of the signed transfer' })
	txHash: string;
}

export type BridgeIntentStatus = {
	intentId: string;
	state: BridgeIntentStateEnum;
	originChain: ChainEnum;
	destinationChain: ChainEnum;
	amount: string;
	tokenID: number;
	destinationAddress: string;
	expiresAt: Date;
	sourceTxHash?: string;
	destinationTxHash?: string;
	/** Raw bridge status, once the bridge observed the transfer */
	bridgeStatus?: TransactionStatusEnum;
	/** Frontend page of the transfer, for the user to follow it */
	transactionUrl?: string;
};
