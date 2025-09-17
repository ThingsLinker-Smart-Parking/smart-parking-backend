import 'reflect-metadata';
import { AppDataSource } from '../data-source';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'payment_paymentmethod_enum'
            AND e.enumlabel = 'cashfree'
        ) THEN
          ALTER TYPE "payment_paymentmethod_enum" ADD VALUE 'cashfree';
        END IF;
      END $$;
    `);

    console.log('Cashfree payment method ensured.');
  } catch (error) {
    console.error('Failed to ensure Cashfree enum value:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run();
