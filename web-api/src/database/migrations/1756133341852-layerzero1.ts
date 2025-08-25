import { MigrationInterface, QueryRunner } from "typeorm";

export class Layerzero11756133341852 implements MigrationInterface {
    name = 'Layerzero11756133341852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "isLayerZero" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "isLayerZero"`);
    }

}
