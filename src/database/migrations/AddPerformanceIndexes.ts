import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1702000000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1702000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add index on users email (unique constraint should already create this, but ensuring it's optimized)
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_email" 
            ON "user" ("email")
        `);

        // Add index on users role for role-based queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_role" 
            ON "user" ("role")
        `);

        // Add index on users isVerified for authentication queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_verified_active" 
            ON "user" ("isVerified", "isActive")
        `);

        // Add index on parking_slot isOccupied for availability queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_parking_slot_occupied" 
            ON "parking_slot" ("isOccupied")
        `);

        // Add composite index on parking_slot floor and occupation status
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_parking_slot_floor_occupied" 
            ON "parking_slot" ("floorId", "isOccupied")
        `);

        // Add index on parking_lot admin for admin-specific queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_parking_lot_admin" 
            ON "parking_lot" ("adminId")
        `);

        // Add index on floor parking_lot for hierarchical queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_floor_parking_lot" 
            ON "floor" ("parkingLotId")
        `);

        // Add index on subscription user and status for user subscription queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscription_user_status" 
            ON "subscription" ("adminId", "status")
        `);

        // Add index on subscription plan for plan-based queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscription_plan" 
            ON "subscription" ("planId")
        `);

        // Add index on subscription_plan isActive for active plan queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_subscription_plan_active" 
            ON "subscription_plan" ("isActive")
        `);

        // Add index on node admin for admin-specific node queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_node_admin" 
            ON "node" ("adminId")
        `);

        // Add index on node parking_slot for node-slot relationship queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_node_parking_slot" 
            ON "node" ("parkingSlotId")
        `);

        // Add index on node isActive for active node queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_node_active" 
            ON "node" ("isActive")
        `);

        // Add index on gateway linkedAdmin for admin-gateway queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gateway_admin" 
            ON "gateway" ("linkedAdminId")
        `);

        // Add index on gateway parking_lot for gateway-lot association
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gateway_parking_lot" 
            ON "gateway" ("parkingLotId")
        `);

        // Add index on gateway isActive for active gateway queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gateway_active" 
            ON "gateway" ("isActive")
        `);

        // Add index on parking_status_log for time-series queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_parking_status_log_slot_timestamp" 
            ON "parking_status_log" ("slotId", "timestamp" DESC)
        `);

        // Add index on parking_status_log node for node-based queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_parking_status_log_node" 
            ON "parking_status_log" ("nodeId")
        `);

        // Add index on payment subscription for payment-subscription queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_subscription" 
            ON "payment" ("subscriptionId")
        `);

        // Add index on payment status and timestamp for payment tracking
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_status_timestamp" 
            ON "payment" ("status", "paymentDate" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all indexes created in up() method
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_users_email"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_users_role"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_users_verified_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_parking_slot_occupied"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_parking_slot_floor_occupied"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_parking_lot_admin"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_floor_parking_lot"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_subscription_user_status"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_subscription_plan"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_subscription_plan_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_node_admin"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_node_parking_slot"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_node_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_gateway_admin"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_gateway_parking_lot"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_gateway_active"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_parking_status_log_slot_timestamp"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_parking_status_log_node"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_payment_subscription"`);
        await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "idx_payment_status_timestamp"`);
    }
}