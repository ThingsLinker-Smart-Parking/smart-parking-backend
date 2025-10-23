import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSubscriptionPlanToPerDevicePricing1760888995700 implements MigrationInterface {
    name = 'UpdateSubscriptionPlanToPerDevicePricing1760888995700'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "pricePerDevicePerMonth" SET DEFAULT '1.5'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "pricePerDevicePerMonth" SET DEFAULT 1.5`);
    }

}
