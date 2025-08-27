import { ChainExtendedEnum, TransactionStatusEnum } from 'src/common/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bridgeTransactions')
export class BridgeTransaction {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	senderAddress: string;

	@Column()
	receiverAddresses: string;

	@Column('numeric', { default: '0', scale: 0, precision: 1000 })
	amount: string;

	@Column({ enum: ChainExtendedEnum, enumName: 'ChainExtendedEnum' })
	originChain: ChainExtendedEnum;

	@Column({ enum: ChainExtendedEnum, enumName: 'ChainExtendedEnum' })
	destinationChain: ChainExtendedEnum;

	@Column('numeric', { default: '0', scale: 0, precision: 1000 })
	nativeTokenAmount: string;

	@Column({ enum: TransactionStatusEnum, enumName: 'TransactionStatusEnum' })
	status: TransactionStatusEnum;

	@Column({ unique: true })
	sourceTxHash: string;

	@Column({ nullable: true })
	destinationTxHash?: string;

	@Column()
	createdAt: Date;

	@Column({ nullable: true })
	finishedAt?: Date;

	@Column({ default: '' })
	txRaw: string;

	@Column({ default: false })
	isCentralized: boolean;

	@Column({ default: false })
	isLayerZero: boolean;
}
