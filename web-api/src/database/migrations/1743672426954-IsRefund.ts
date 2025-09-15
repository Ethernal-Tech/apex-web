/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class IsRefund1743672426954 implements MigrationInterface {
    name = 'IsRefund1743672426954'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" ADD "isRefund" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bridgeTransactions" DROP COLUMN "isRefund"`);
    }

}
