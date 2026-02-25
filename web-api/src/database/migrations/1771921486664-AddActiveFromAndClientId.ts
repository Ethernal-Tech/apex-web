import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActiveFromAndClientId1771921486664 implements MigrationInterface {
    name = 'AddActiveFromAndClientId1771921486664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "activeFrom" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "clientID" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "clientID"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "activeFrom"`);
    }

}
