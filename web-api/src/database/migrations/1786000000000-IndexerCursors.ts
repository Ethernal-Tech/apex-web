import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexerCursors1786000000000 implements MigrationInterface {
	name = 'IndexerCursors1786000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "indexerCursors" (
				"bridgingMode" character varying NOT NULL,
				"lastSeq" bigint NOT NULL DEFAULT '0',
				"updatedAt" TIMESTAMP NOT NULL,
				CONSTRAINT "PK_indexerCursors_bridgingMode" PRIMARY KEY ("bridgingMode")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "indexerCursors"`);
	}
}
