import { MigrationInterface, QueryRunner } from 'typeorm';

export class LayerZeroSync1788100000000 implements MigrationInterface {
	name = 'LayerZeroSync1788100000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "layerZeroSyncStates" (
				"chain" character varying NOT NULL,
				"oftAddress" character varying NOT NULL,
				"eid" integer NOT NULL,
				"backfillToken" character varying,
				"backfillDone" boolean NOT NULL DEFAULT false,
				"updatedAt" TIMESTAMP WITH TIME ZONE,
				CONSTRAINT "PK_layerZeroSyncStates_chain" PRIMARY KEY ("chain")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "layerZeroSyncStates"`);
	}
}
