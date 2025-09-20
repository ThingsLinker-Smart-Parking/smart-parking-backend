import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNodeGatewayRelationship1726700000000 implements MigrationInterface {
    name = 'RemoveNodeGatewayRelationship1726700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the foreign key constraint exists before dropping it
        const gatewayFkExists = await queryRunner.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'node'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%gateway%'
        `);

        if (gatewayFkExists.length > 0) {
            // Drop the foreign key constraint
            await queryRunner.query(`ALTER TABLE "node" DROP CONSTRAINT "${gatewayFkExists[0].constraint_name}"`);
        }

        // Check if the gateway column exists before dropping it
        const gatewayColumnExists = await queryRunner.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'node'
            AND column_name = 'gatewayId'
        `);

        if (gatewayColumnExists.length > 0) {
            // Drop the gatewayId column
            await queryRunner.query(`ALTER TABLE "node" DROP COLUMN "gatewayId"`);
        }

        // Check if gateway-related indexes exist and drop them
        const gatewayIndexes = await queryRunner.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'node'
            AND indexname LIKE '%gateway%'
        `);

        for (const indexRow of gatewayIndexes) {
            await queryRunner.query(`DROP INDEX IF EXISTS "${indexRow.indexname}"`);
        }

        // Update any existing indexes to focus on admin and isActive instead
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_node_admin_isActive" ON "node" ("adminId", "isActive")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add the gatewayId column back
        await queryRunner.query(`ALTER TABLE "node" ADD COLUMN "gatewayId" uuid`);

        // Add the foreign key constraint back
        await queryRunner.query(`ALTER TABLE "node" ADD CONSTRAINT "FK_node_gateway" FOREIGN KEY ("gatewayId") REFERENCES "gateway"("id") ON DELETE CASCADE`);

        // Recreate the gateway-related index
        await queryRunner.query(`CREATE INDEX "IDX_node_gateway_isActive" ON "node" ("gatewayId", "isActive")`);

        // Drop the admin-focused index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_node_admin_isActive"`);
    }
}