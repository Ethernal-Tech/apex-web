import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Position of the last bridging transaction pulled from the cardano-api
 * instance of a bridging mode.
 */
@Entity('indexerCursors')
export class IndexerCursor {
	@PrimaryColumn()
	bridgingMode: string;

	// bigint is returned as string by the postgres driver
	@Column('bigint', { default: '0' })
	lastSeq: string;

	@Column({ type: 'timestamp' })
	updatedAt: Date;
}
