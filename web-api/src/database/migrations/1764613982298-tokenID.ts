import { MigrationInterface, QueryRunner } from "typeorm";

export class TokenID1764613982298 implements MigrationInterface {
    name = 'TokenID1764613982298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "tokenID" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "tokenID"`);
    }

}
