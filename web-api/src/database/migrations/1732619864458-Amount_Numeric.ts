/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class AmountNumeric1732619864458 implements MigrationInterface {
    name = 'AmountNumeric1732619864458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "amount" numeric(1000,0) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "amount" bigint NOT NULL DEFAULT '0'`);
    }

}
