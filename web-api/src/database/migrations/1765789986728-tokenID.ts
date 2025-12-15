import { MigrationInterface, QueryRunner } from "typeorm";

export class TokenID1765789986728 implements MigrationInterface {
    name = 'TokenID1765789986728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "tokenID" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "tokenID"`);
    }

}
