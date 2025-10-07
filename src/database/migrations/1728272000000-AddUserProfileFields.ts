import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileFields1728272000000 implements MigrationInterface {
    name = 'AddUserProfileFields1728272000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to users table
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "phone" VARCHAR(15),
            ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "gstNumber" VARCHAR(15),
            ADD COLUMN IF NOT EXISTS "address" TEXT,
            ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
            ADD COLUMN IF NOT EXISTS "state" VARCHAR(100),
            ADD COLUMN IF NOT EXISTS "zipCode" VARCHAR(10),
            ADD COLUMN IF NOT EXISTS "country" VARCHAR(100),
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        // Create index on phone for faster lookups
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_users_phone" ON "users" ("phone")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone"`);

        // Drop the new columns
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "phone",
            DROP COLUMN IF EXISTS "companyName",
            DROP COLUMN IF EXISTS "gstNumber",
            DROP COLUMN IF EXISTS "address",
            DROP COLUMN IF EXISTS "city",
            DROP COLUMN IF EXISTS "state",
            DROP COLUMN IF EXISTS "zipCode",
            DROP COLUMN IF EXISTS "country",
            DROP COLUMN IF EXISTS "updatedAt"
        `);
    }
}
