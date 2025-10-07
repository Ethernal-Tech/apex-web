import { MigrationInterface, QueryRunner } from "typeorm";

export class SkylineFields1759402823649 implements MigrationInterface {
    name = 'SkylineFields1759402823649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "nativeTokenAmount" numeric(1000,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "isLayerZero" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "isLayerZero"`);
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "nativeTokenAmount"`);
    }

}
