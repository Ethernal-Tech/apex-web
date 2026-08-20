import { MigrationInterface, QueryRunner } from 'typeorm';

export class AmountWeiColumns1785800000000 implements MigrationInterface {
	name = 'AmountWeiColumns1785800000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "bridgeTransactions"
			ADD "amountWei" numeric(1000,0) NOT NULL DEFAULT '0'
		`);
		await queryRunner.query(`
			ALTER TABLE "bridgeTransactions"
			ADD "tokenAmountWei" numeric(1000,0) NOT NULL DEFAULT '0'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" DROP COLUMN "tokenAmountWei"`,
		);
		await queryRunner.query(
			`ALTER TABLE "bridgeTransactions" DROP COLUMN "amountWei"`,
		);
	}
}
