/* eslint-disable prettier/prettier */
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1743671368057 implements MigrationInterface {
    name = 'InitMigration1743671368057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bridgeTransactions" ("id" SERIAL NOT NULL, "senderAddress" character varying NOT NULL, "receiverAddresses" character varying NOT NULL, "amount" numeric(1000,0) NOT NULL DEFAULT '0', "originChain" character varying NOT NULL, "destinationChain" character varying NOT NULL, "status" character varying NOT NULL, "sourceTxHash" character varying NOT NULL, "destinationTxHash" character varying, "createdAt" TIMESTAMP NOT NULL, "finishedAt" TIMESTAMP, "txRaw" character varying NOT NULL DEFAULT '', "isCentralized" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_145d7967dabd7a4d39731811fb5" UNIQUE ("sourceTxHash"), CONSTRAINT "PK_d2b06554802cf8db0df8281298b" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "bridgeTransactions"`);
    }

}
