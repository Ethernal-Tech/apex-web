import { ChainEnum } from 'src/common/enum';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * How far the LayerZero status cron has read each chain's OApp listing, one row
 * per chain.
 *
 * The listing is newest first, so the newest messages are found by reading it
 * from the top every run. `backfillToken` is the other end of that walk: the page
 * cursor the history below what has been read continues from, kept until the
 * listing runs out and `backfillDone` is set.
 *
 * Both are only meaningful for the OApp in `oftAddress` on `eid`. Pointing a
 * chain at another contract or endpoint means what was read says nothing about
 * the new one, so the walk starts over.
 */
@Entity('layerZeroSyncStates')
export class LayerZeroSyncState {
	@PrimaryColumn({ type: 'varchar' })
	chain: ChainEnum;

	@Column({ type: 'varchar' })
	oftAddress: string;

	@Column({ type: 'int' })
	eid: number;

	/** Null before the backfill has anywhere to resume from, and once it is done. */
	@Column({ type: 'varchar', nullable: true })
	backfillToken?: string | null;

	@Column({ default: false })
	backfillDone: boolean;

	@Column({ type: 'timestamptz', nullable: true })
	updatedAt?: Date;
}
