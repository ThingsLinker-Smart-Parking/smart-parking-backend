"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1695000000000 = void 0;
class InitialSchema1695000000000 {
    constructor() {
        this.name = 'InitialSchema1695000000000';
    }
    async up(queryRunner) {
        // Create Users table
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "firstName" character varying NOT NULL,
                "lastName" character varying NOT NULL,
                "role" character varying NOT NULL DEFAULT 'user',
                "isVerified" boolean NOT NULL DEFAULT false,
                "otp" character varying,
                "otpExpiry" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_user_email" UNIQUE ("email"),
                CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
            )
        `);
        // Create Subscription Plans table
        await queryRunner.query(`
            CREATE TABLE "subscription_plan" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "basePricePerMonth" numeric NOT NULL,
                "basePricePerYear" numeric NOT NULL,
                "basePricePerQuarter" numeric,
                "pricePerNodePerMonth" numeric NOT NULL DEFAULT 2.00,
                "pricePerNodePerYear" numeric NOT NULL DEFAULT 20.00,
                "maxGateways" integer NOT NULL DEFAULT 0,
                "maxParkingLots" integer NOT NULL DEFAULT 0,
                "maxFloors" integer NOT NULL DEFAULT 0,
                "maxParkingSlots" integer NOT NULL DEFAULT 0,
                "maxUsers" integer NOT NULL DEFAULT 0,
                "features" text array,
                "includesAnalytics" boolean NOT NULL DEFAULT false,
                "includesSupport" boolean NOT NULL DEFAULT false,
                "includesAPI" boolean NOT NULL DEFAULT false,
                "includesCustomization" boolean NOT NULL DEFAULT false,
                "defaultBillingCycle" character varying NOT NULL DEFAULT 'monthly',
                "isActive" boolean NOT NULL DEFAULT true,
                "isPopular" boolean NOT NULL DEFAULT false,
                "sortOrder" integer NOT NULL DEFAULT 0,
                "usdToInrRate" numeric NOT NULL DEFAULT 75.00,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "UQ_subscription_plan_name" UNIQUE ("name"),
                CONSTRAINT "PK_subscription_plan_id" PRIMARY KEY ("id")
            )
        `);
        // Create Parking Lots table
        await queryRunner.query(`
            CREATE TABLE "parking_lot" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "address" text,
                "adminId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_parking_lot_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_parking_lot_admin" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);
        // Create Gateways table
        await queryRunner.query(`
            CREATE TABLE "gateway" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "chirpstackGatewayId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "location" character varying,
                "latitude" numeric,
                "longitude" numeric,
                "isActive" boolean NOT NULL DEFAULT true,
                "lastSeen" TIMESTAMP,
                "metadata" jsonb,
                "linkedAdminId" uuid,
                "parkingLotId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_gateway_chirpstack_id" UNIQUE ("chirpstackGatewayId"),
                CONSTRAINT "PK_gateway_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_gateway_linked_admin" FOREIGN KEY ("linkedAdminId") REFERENCES "user"("id") ON DELETE SET NULL,
                CONSTRAINT "FK_gateway_parking_lot" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lot"("id") ON DELETE SET NULL
            )
        `);
        // Create Floors table
        await queryRunner.query(`
            CREATE TABLE "floor" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "level" integer,
                "parkingLotId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_floor_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_floor_parking_lot" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lot"("id") ON DELETE CASCADE
            )
        `);
        // Create Parking Slots table
        await queryRunner.query(`
            CREATE TABLE "parking_slot" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "isReservable" boolean NOT NULL DEFAULT false,
                "floorId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_parking_slot_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_parking_slot_floor" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE
            )
        `);
        // Create Nodes table
        await queryRunner.query(`
            CREATE TABLE "node" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "chirpstackDeviceId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "description" text,
                "latitude" numeric,
                "longitude" numeric,
                "batteryLevel" integer,
                "lastSeen" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "metadata" jsonb,
                "adminId" uuid NOT NULL,
                "gatewayId" uuid NOT NULL,
                "parkingSlotId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_node_chirpstack_device_id" UNIQUE ("chirpstackDeviceId"),
                CONSTRAINT "PK_node_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_node_admin" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_node_gateway" FOREIGN KEY ("gatewayId") REFERENCES "gateway"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_node_parking_slot" FOREIGN KEY ("parkingSlotId") REFERENCES "parking_slot"("id") ON DELETE SET NULL
            )
        `);
        // Create Parking Status Log table
        await queryRunner.query(`
            CREATE TABLE "parking_status_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "status" character varying NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "distance" numeric,
                "percentage" numeric,
                "batteryLevel" integer,
                "metadata" jsonb,
                "parkingSlotId" uuid NOT NULL,
                "nodeId" uuid NOT NULL,
                CONSTRAINT "PK_parking_status_log_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_parking_status_log_parking_slot" FOREIGN KEY ("parkingSlotId") REFERENCES "parking_slot"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_parking_status_log_node" FOREIGN KEY ("nodeId") REFERENCES "node"("id") ON DELETE CASCADE
            )
        `);
        // Create Subscriptions table
        await queryRunner.query(`
            CREATE TABLE "subscription" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "status" character varying NOT NULL DEFAULT 'pending',
                "billingCycle" character varying NOT NULL,
                "amount" numeric NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'USD',
                "startDate" TIMESTAMP NOT NULL,
                "endDate" TIMESTAMP NOT NULL,
                "nextBillingDate" TIMESTAMP,
                "isAutoRenew" boolean NOT NULL DEFAULT true,
                "trialDays" integer NOT NULL DEFAULT 0,
                "metadata" jsonb,
                "adminId" uuid NOT NULL,
                "planId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_subscription_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_subscription_admin" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_subscription_plan" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE CASCADE
            )
        `);
        // Create Payments table
        await queryRunner.query(`
            CREATE TABLE "payment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "amount" numeric NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'USD',
                "status" character varying NOT NULL DEFAULT 'pending',
                "paymentMethod" character varying NOT NULL,
                "gatewayTransactionId" character varying,
                "gatewayResponse" jsonb,
                "failureReason" character varying,
                "refundAmount" numeric,
                "refundReason" character varying,
                "metadata" jsonb,
                "subscriptionId" uuid NOT NULL,
                "processedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_payment_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_payment_subscription" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE
            )
        `);
        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_user_email" ON "user" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_role" ON "user" ("role")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_is_active" ON "user" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_is_verified" ON "user" ("isVerified")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_plan_is_active" ON "subscription_plan" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_plan_is_popular" ON "subscription_plan" ("isPopular")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_plan_sort_order" ON "subscription_plan" ("sortOrder")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_lot_admin_id" ON "parking_lot" ("adminId")`);
        await queryRunner.query(`CREATE INDEX "IDX_gateway_chirpstack_id" ON "gateway" ("chirpstackGatewayId")`);
        await queryRunner.query(`CREATE INDEX "IDX_gateway_is_active" ON "gateway" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_gateway_linked_admin_id" ON "gateway" ("linkedAdminId")`);
        await queryRunner.query(`CREATE INDEX "IDX_gateway_parking_lot_id" ON "gateway" ("parkingLotId")`);
        await queryRunner.query(`CREATE INDEX "IDX_floor_parking_lot_id" ON "floor" ("parkingLotId")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_slot_floor_id" ON "parking_slot" ("floorId")`);
        await queryRunner.query(`CREATE INDEX "IDX_node_chirpstack_device_id" ON "node" ("chirpstackDeviceId")`);
        await queryRunner.query(`CREATE INDEX "IDX_node_admin_id" ON "node" ("adminId")`);
        await queryRunner.query(`CREATE INDEX "IDX_node_gateway_id" ON "node" ("gatewayId")`);
        await queryRunner.query(`CREATE INDEX "IDX_node_parking_slot_id" ON "node" ("parkingSlotId")`);
        await queryRunner.query(`CREATE INDEX "IDX_node_is_active" ON "node" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_status_log_parking_slot_id" ON "parking_status_log" ("parkingSlotId")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_status_log_node_id" ON "parking_status_log" ("nodeId")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_status_log_timestamp" ON "parking_status_log" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_parking_status_log_status" ON "parking_status_log" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_admin_id" ON "subscription" ("adminId")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_plan_id" ON "subscription" ("planId")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_status" ON "subscription" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_end_date" ON "subscription" ("endDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_subscription_next_billing_date" ON "subscription" ("nextBillingDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_payment_subscription_id" ON "payment" ("subscriptionId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payment_status" ON "payment" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_payment_gateway_transaction_id" ON "payment" ("gatewayTransactionId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payment_created_at" ON "payment" ("createdAt")`);
    }
    async down(queryRunner) {
        // Drop tables in reverse order to avoid foreign key conflicts
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`DROP TABLE "parking_status_log"`);
        await queryRunner.query(`DROP TABLE "node"`);
        await queryRunner.query(`DROP TABLE "parking_slot"`);
        await queryRunner.query(`DROP TABLE "floor"`);
        await queryRunner.query(`DROP TABLE "gateway"`);
        await queryRunner.query(`DROP TABLE "parking_lot"`);
        await queryRunner.query(`DROP TABLE "subscription_plan"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }
}
exports.InitialSchema1695000000000 = InitialSchema1695000000000;
