/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class TxRaw1729758504880 implements MigrationInterface {
    name = 'TxRaw1729758504880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "txRaw" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "txRaw"`);
    }

}
