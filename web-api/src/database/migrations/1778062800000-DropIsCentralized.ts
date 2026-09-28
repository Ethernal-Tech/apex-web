import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropIsCentralized1778062800000 implements MigrationInterface {
	name = 'DropIsCentralized1778062800000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" DROP COLUMN "isCentralized"`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" ADD "isCentralized" boolean NOT NULL DEFAULT false`,
		);
	}
}
