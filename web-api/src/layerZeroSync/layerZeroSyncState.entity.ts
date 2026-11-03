import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * How far the LayerZero scan listing of one chain's OFT has been read.
 *
 * The listing is newest first, so new transfers are always read from its top.
 * The backfill cursor walks the older part of the listing, once.
 */
@Entity('layerZeroSyncStates')
export class LayerZeroSyncState {
	@PrimaryColumn()
	chain: string;

	/** the listing the cursor belongs to, a changed config starts over */
	@Column()
	oftAddress: string;

	@Column('int')
	eid: number;

	/** the page the backfill continues from, null when there is none pending */
	@Column({ type: 'varchar', nullable: true })
	backfillToken: string | null;

	@Column({ default: false })
	backfillDone: boolean;

	@Column({ type: 'timestamp' })
	updatedAt: Date;
}
