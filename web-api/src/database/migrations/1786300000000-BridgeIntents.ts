import { MigrationInterface, QueryRunner } from 'typeorm';

export class BridgeIntents1786300000000 implements MigrationInterface {
	name = 'BridgeIntents1786300000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "bridgeIntents" (
				"id" uuid NOT NULL,
				"originChain" character varying NOT NULL,
				"destinationChain" character varying NOT NULL,
				"tokenID" integer NOT NULL,
				"amount" character varying NOT NULL,
				"destinationAddress" character varying NOT NULL,
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"txHash" character varying,
				"submittedAt" TIMESTAMP WITH TIME ZONE,
				CONSTRAINT "PK_bridgeIntents_id" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(
			`CREATE INDEX "IDX_bridgeIntents_expiresAt" ON "bridgeIntents" ("expiresAt") WHERE "txHash" IS NULL`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "IDX_bridgeIntents_expiresAt"`);
		await queryRunner.query(`DROP TABLE "bridgeIntents"`);
	}
}
