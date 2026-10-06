import { BridgingModeEnum } from 'src/common/enum';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Where the oracle sync cron got to, one row per bridging mode.
 *
 * `syncIndex` is the oracle's own insertion counter, not a timestamp or a tx hash. It is only
 * meaningful for the oracle database identified by `instanceId` - a different instanceId means that
 * database was recreated and the sweep has to start over from zero.
 */
@Entity('oracleSyncStates')
export class OracleSyncState {
	@PrimaryColumn({ type: 'varchar' })
	bridgingMode: BridgingModeEnum;

	@Column('numeric', { default: '0', scale: 0, precision: 20 })
	syncIndex: string;

	@Column({ type: 'varchar', nullable: true })
	instanceId?: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	updatedAt?: Date;
}
