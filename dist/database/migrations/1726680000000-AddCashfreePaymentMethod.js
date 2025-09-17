"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCashfreePaymentMethod1726680000000 = void 0;
class AddCashfreePaymentMethod1726680000000 {
    constructor() {
        this.name = 'AddCashfreePaymentMethod1726680000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
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
    }
    async down(queryRunner) {
        // Postgres enums do not support removing values easily.
        // If rollback is required, consider recreating the enum without the value.
    }
}
exports.AddCashfreePaymentMethod1726680000000 = AddCashfreePaymentMethod1726680000000;
