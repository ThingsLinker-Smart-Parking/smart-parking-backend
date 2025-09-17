import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCashfreePaymentMethod1726680000000 implements MigrationInterface {
    name = 'AddCashfreePaymentMethod1726680000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
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

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres enums do not support removing values easily.
        // If rollback is required, consider recreating the enum without the value.
    }
}
