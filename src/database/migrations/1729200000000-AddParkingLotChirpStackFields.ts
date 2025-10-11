import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParkingLotChirpStackFields1729200000000 implements MigrationInterface {
    name = 'AddParkingLotChirpStackFields1729200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add ChirpStack Application ID fields to parking_lot table
        await queryRunner.query(`
            ALTER TABLE "parking_lot"
            ADD COLUMN IF NOT EXISTS "chirpstackApplicationId" VARCHAR,
            ADD COLUMN IF NOT EXISTS "chirpstackApplicationName" VARCHAR
        `);

        // Create unique index on chirpstackApplicationId for faster lookups and uniqueness constraint
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_parking_lot_chirpstack_application_id"
            ON "parking_lot" ("chirpstackApplicationId")
            WHERE "chirpstackApplicationId" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_parking_lot_chirpstack_application_id"`);

        // Drop the new columns
        await queryRunner.query(`
            ALTER TABLE "parking_lot"
            DROP COLUMN IF EXISTS "chirpstackApplicationId",
            DROP COLUMN IF EXISTS "chirpstackApplicationName"
        `);
    }
}
