/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueSourceTxHashUniqueMigration1734340100368 implements MigrationInterface {
    name = 'UniqueSourceTxHashUniqueMigration1734340100368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD CONSTRAINT "UQ_145d7967dabd7a4d39731811fb5" UNIQUE ("sourceTxHash")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP CONSTRAINT "UQ_145d7967dabd7a4d39731811fb5"`);
    }

}
