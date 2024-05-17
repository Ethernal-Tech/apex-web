import { ChainEnum, TransactionStatusEnum } from 'src/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bridgeTransactions')
export class BridgeTransaction {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	senderAddress: string;

	@Column()
	receiverAddress: string;

	@Column()
	amount: number;

	@Column({ enum: ChainEnum, enumName: 'ChainEnum' })
	originChain: ChainEnum;

	@Column({ enum: ChainEnum, enumName: 'ChainEnum' })
	destinationChain: ChainEnum;

	@Column({ enum: TransactionStatusEnum, enumName: 'TransactionStatusEnum' })
	status: TransactionStatusEnum;

	@Column()
	sourceTxHash: string;

	@Column()
	createdAt: Date;

	@Column({ nullable: true })
	finishedAt?: Date;
}
