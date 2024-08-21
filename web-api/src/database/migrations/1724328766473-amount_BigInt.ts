/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class AmountBigInt1724328766473 implements MigrationInterface {
    name = 'AmountBigInt1724328766473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "amount" bigint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "amount" integer NOT NULL`);
    }

}
