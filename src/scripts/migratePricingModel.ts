import { AppDataSource } from '../data-source';
import { logger } from '../services/loggerService';

/**
 * Migration script to update subscription plan pricing model
 * From base + per-node pricing to simple per-device pricing
 */

async function migratePricingModel() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected for pricing model migration');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Add deviceCount column to subscriptions table if it doesn't exist
      console.log('Adding deviceCount column to subscriptions...');
      await queryRunner.query(`
        ALTER TABLE "subscription"
        ADD COLUMN IF NOT EXISTS "deviceCount" integer NOT NULL DEFAULT 1
      `);

      // Check if old pricing columns exist
      const tableInfo = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'subscription_plan'
        AND column_name IN ('basePricePerMonth', 'pricePerNodePerMonth')
      `);

      if (tableInfo.length > 0) {
        console.log('Removing old pricing columns from subscription_plan...');
        await queryRunner.query(`
          ALTER TABLE "subscription_plan"
          DROP COLUMN IF EXISTS "basePricePerMonth",
          DROP COLUMN IF EXISTS "basePricePerYear",
          DROP COLUMN IF EXISTS "basePricePerQuarter",
          DROP COLUMN IF EXISTS "pricePerNodePerMonth",
          DROP COLUMN IF EXISTS "pricePerNodePerYear",
          DROP COLUMN IF EXISTS "quarterlyNodePrice"
        `);
      }

      // Ensure new pricing columns exist with correct defaults
      console.log('Ensuring new pricing columns exist...');
      await queryRunner.query(`
        ALTER TABLE "subscription_plan"
        ADD COLUMN IF NOT EXISTS "pricePerDevicePerMonth" decimal(10,2) NOT NULL DEFAULT 1.50,
        ADD COLUMN IF NOT EXISTS "pricePerDevicePerYear" decimal(10,2) NOT NULL DEFAULT 15.00,
        ADD COLUMN IF NOT EXISTS "pricePerDevicePerQuarter" decimal(10,2) NOT NULL DEFAULT 4.00
      `);

      await queryRunner.commitTransaction();
      console.log('\n✅ Pricing model migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run seed:plans');
      console.log('2. Restart your backend server');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Error migrating pricing model:', error);
    console.error(error);
    process.exit(1);
  }
}

migratePricingModel();
