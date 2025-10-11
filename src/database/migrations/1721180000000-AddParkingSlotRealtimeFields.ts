import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParkingSlotRealtimeFields1721180000000 implements MigrationInterface {
    name = 'AddParkingSlotRealtimeFields1721180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "status" character varying NOT NULL DEFAULT 'unknown'`);
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "statusUpdatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "lastMessageReceivedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "lastSensorState" character varying`);
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "lastDistanceCm" numeric(7,2)`);
        await queryRunner.query(`ALTER TABLE "parking_slot" ADD "lastGatewayId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "lastGatewayId"`);
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "lastDistanceCm"`);
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "lastSensorState"`);
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "lastMessageReceivedAt"`);
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "statusUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "parking_slot" DROP COLUMN "status"`);
    }
}
