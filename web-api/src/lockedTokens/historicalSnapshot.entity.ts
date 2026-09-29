import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ChainTokenAmounts = {
	[chain: string]: { [tokenId: string]: string };
};

@Entity('historicalSnapshots')
export class HistoricalSnapshot {
	@PrimaryColumn({ type: 'timestamptz' })
	snapshotAt: Date;

	@Column({ type: 'jsonb' })
	tvlByChain: ChainTokenAmounts;

	@Column('numeric', { precision: 1000, scale: 0, default: '0' })
	tvlLayerZeroApex: string;

	@Column({ type: 'jsonb' })
	tvbByChain: ChainTokenAmounts;

	@Column('numeric', { precision: 1000, scale: 0, default: '0' })
	tvlApex: string;

	@Column('numeric', { precision: 1000, scale: 0, default: '0' })
	tvlAda: string;

	@Column('numeric', { precision: 1000, scale: 0, default: '0' })
	tvbApex: string;

	@Column('numeric', { precision: 1000, scale: 0, default: '0' })
	tvbAda: string;
}
