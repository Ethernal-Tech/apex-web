import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bridgeTransactions')
export class BridgeTransaction {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	senderAddress: string;

	@Column()
	receiverAddresses: string;

	@Column('bigint', { default: '0' })
	amount: string;

	@Column({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@Column({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@Column({ enum: TransactionStatusEnum, enumName: 'TransactionStatusEnum' })
	status: TransactionStatusEnum;

	@Column()
	sourceTxHash: string;

	@Column({ nullable: true })
	destinationTxHash?: string;

	@Column()
	createdAt: Date;

	@Column({ nullable: true })
	finishedAt?: Date;

	@Column({ default: false })
	isCentralized: boolean;
}
