import { MigrationInterface, QueryRunner } from 'typeorm';

export class BridgeTransactionBridgingMode1786200000000
	implements MigrationInterface
{
	name = 'BridgeTransactionBridgingMode1786200000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "bridgeTransactions"
			ADD "bridgingMode" character varying
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" DROP COLUMN "bridgingMode"`,
		);
	}
}
