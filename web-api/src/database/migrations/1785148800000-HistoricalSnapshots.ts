import { MigrationInterface, QueryRunner } from 'typeorm';

export class HistoricalSnapshots1785148800000 implements MigrationInterface {
	name = 'HistoricalSnapshots1785148800000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "historicalSnapshots" (
				"snapshotAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"tvlByChain" jsonb NOT NULL,
				"tvlLayerZeroApex" numeric(1000,0) NOT NULL DEFAULT '0',
				"tvbByChain" jsonb NOT NULL,
				"tvlApex" numeric(1000,0) NOT NULL DEFAULT '0',
				"tvlAda" numeric(1000,0) NOT NULL DEFAULT '0',
				"tvbApex" numeric(1000,0) NOT NULL DEFAULT '0',
				"tvbAda" numeric(1000,0) NOT NULL DEFAULT '0',
				CONSTRAINT "PK_historicalSnapshots_snapshotAt" PRIMARY KEY ("snapshotAt")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "historicalSnapshots"`);
	}
}
