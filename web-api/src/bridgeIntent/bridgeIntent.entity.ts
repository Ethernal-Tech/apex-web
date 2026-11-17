import { ChainEnum } from 'src/common/enum';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * A bridging transfer prepared on behalf of a user (e.g. by an AI agent through
 * MCP), waiting for the user to sign it with their own wallet in the frontend.
 * Immutable once created, except for the tx hash recorded after signing.
 */
@Entity('bridgeIntents')
// expired intents nobody signed are cleaned up by expiresAt
@Index('IDX_bridgeIntents_expiresAt', ['expiresAt'], {
	where: '"txHash" IS NULL',
})
export class BridgeIntent {
	// random UUID - knowing it is what grants access to the intent
	@PrimaryColumn('uuid')
	id: string;

	@Column({ type: 'varchar' })
	originChain: ChainEnum;

	@Column({ type: 'varchar' })
	destinationChain: ChainEnum;

	@Column()
	tokenID: number;

	/** Human-readable amount, in the units shown by the bridge form */
	@Column()
	amount: string;

	@Column()
	destinationAddress: string;

	@Column({ type: 'timestamptz' })
	createdAt: Date;

	@Column({ type: 'timestamptz' })
	expiresAt: Date;

	/** Source chain tx hash, set once the user signed and submitted the tx */
	@Column({ type: 'varchar', nullable: true })
	txHash: string | null;

	@Column({ type: 'timestamptz', nullable: true })
	submittedAt: Date | null;
}
