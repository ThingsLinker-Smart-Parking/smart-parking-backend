"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubscriptionPlanToPerDevicePricing1760889000000 = void 0;
class UpdateSubscriptionPlanToPerDevicePricing1760889000000 {
    constructor() {
        this.name = 'UpdateSubscriptionPlanToPerDevicePricing1760889000000';
    }
    async up(queryRunner) {
        // Add deviceCount column to subscriptions table if it doesn't exist
        await queryRunner.query(`
            ALTER TABLE "subscription"
            ADD COLUMN IF NOT EXISTS "deviceCount" integer NOT NULL DEFAULT 1
        `);
        // Remove old pricing columns from subscription_plan if they exist
        await queryRunner.query(`
            ALTER TABLE "subscription_plan"
            DROP COLUMN IF EXISTS "basePricePerMonth",
            DROP COLUMN IF EXISTS "basePricePerYear",
            DROP COLUMN IF EXISTS "basePricePerQuarter",
            DROP COLUMN IF EXISTS "pricePerNodePerMonth",
            DROP COLUMN IF EXISTS "pricePerNodePerYear",
            DROP COLUMN IF EXISTS "quarterlyNodePrice"
        `);
        // Ensure new pricing columns exist with correct defaults
        await queryRunner.query(`
            ALTER TABLE "subscription_plan"
            ADD COLUMN IF NOT EXISTS "pricePerDevicePerMonth" decimal(10,2) NOT NULL DEFAULT 1.50,
            ADD COLUMN IF NOT EXISTS "pricePerDevicePerYear" decimal(10,2) NOT NULL DEFAULT 15.00,
            ADD COLUMN IF NOT EXISTS "pricePerDevicePerQuarter" decimal(10,2) NOT NULL DEFAULT 4.00
        `);
    }
    async down(queryRunner) {
        // Remove deviceCount column from subscriptions
        await queryRunner.query(`
            ALTER TABLE "subscription"
            DROP COLUMN IF EXISTS "deviceCount"
        `);
        // Restore old pricing columns
        await queryRunner.query(`
            ALTER TABLE "subscription_plan"
            ADD COLUMN IF NOT EXISTS "basePricePerMonth" decimal(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "basePricePerYear" decimal(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "basePricePerQuarter" decimal(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "pricePerNodePerMonth" decimal(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "pricePerNodePerYear" decimal(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "quarterlyNodePrice" decimal(10,2) NOT NULL DEFAULT 0
        `);
        // Remove new pricing columns
        await queryRunner.query(`
            ALTER TABLE "subscription_plan"
            DROP COLUMN IF EXISTS "pricePerDevicePerMonth",
            DROP COLUMN IF EXISTS "pricePerDevicePerYear",
            DROP COLUMN IF EXISTS "pricePerDevicePerQuarter"
        `);
    }
}
exports.UpdateSubscriptionPlanToPerDevicePricing1760889000000 = UpdateSubscriptionPlanToPerDevicePricing1760889000000;
