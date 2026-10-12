import { MigrationInterface, QueryRunner } from 'typeorm';

export class OracleSync1788000000000 implements MigrationInterface {
	name = 'OracleSync1788000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "oracleSyncStates" (
				"bridgingMode" character varying NOT NULL,
				"syncIndex" numeric(20,0) NOT NULL DEFAULT '0',
				"instanceId" character varying,
				"updatedAt" TIMESTAMP WITH TIME ZONE,
				CONSTRAINT "PK_oracleSyncStates_bridgingMode" PRIMARY KEY ("bridgingMode")
			)
		`);
		await queryRunner.query(`
			ALTER TABLE "bridgeTransactions"
			ADD "isOracleDiscovered" boolean NOT NULL DEFAULT false
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" DROP COLUMN "isOracleDiscovered"`,
		);
		await queryRunner.query(`DROP TABLE "oracleSyncStates"`);
	}
}
