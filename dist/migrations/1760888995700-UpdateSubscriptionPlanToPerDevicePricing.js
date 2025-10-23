"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubscriptionPlanToPerDevicePricing1760888995700 = void 0;
class UpdateSubscriptionPlanToPerDevicePricing1760888995700 {
    constructor() {
        this.name = 'UpdateSubscriptionPlanToPerDevicePricing1760888995700';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "pricePerDevicePerMonth" SET DEFAULT '1.5'`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "pricePerDevicePerMonth" SET DEFAULT 1.5`);
    }
}
exports.UpdateSubscriptionPlanToPerDevicePricing1760888995700 = UpdateSubscriptionPlanToPerDevicePricing1760888995700;
