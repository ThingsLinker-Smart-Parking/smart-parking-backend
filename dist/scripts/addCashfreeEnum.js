"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
async function run() {
    try {
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
        }
        await data_source_1.AppDataSource.query(`
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
    }
    catch (error) {
        console.error('Failed to ensure Cashfree enum value:', error);
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
run();
