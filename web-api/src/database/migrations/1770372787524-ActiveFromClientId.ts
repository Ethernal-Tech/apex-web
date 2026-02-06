import { MigrationInterface, QueryRunner } from "typeorm";

export class ActiveFromClientId1770372787524 implements MigrationInterface {
    name = 'ActiveFromClientId1770372787524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "activeFrom" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "clientID" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "clientID"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "activeFrom"`);
    }

}
