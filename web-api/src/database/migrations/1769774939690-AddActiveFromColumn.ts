import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActiveFromColumn1769774939690 implements MigrationInterface {
    name = 'AddActiveFromColumn1769774939690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "activeFrom" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "activeFrom"`);
    }

}
