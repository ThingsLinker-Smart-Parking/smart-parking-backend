-- Fix missing columns in parking_lot table
ALTER TABLE parking_lot
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Fix subscription table (it should be adminId, not userId)
-- Check if the column exists and add it if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscription' AND column_name = 'adminId') THEN
        ALTER TABLE subscription ADD COLUMN "adminId" uuid;

        -- If there's a userId column, migrate the data
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscription' AND column_name = 'userId') THEN
            UPDATE subscription SET "adminId" = "userId";
            ALTER TABLE subscription DROP COLUMN "userId";
        END IF;
    END IF;
END $$;

-- Ensure foreign key constraints exist
ALTER TABLE subscription
ADD CONSTRAINT IF NOT EXISTS "FK_subscription_admin"
FOREIGN KEY ("adminId") REFERENCES "user"(id) ON DELETE CASCADE;

-- Check and fix gateway table structure
DO $$
BEGIN
    -- Add linkedAdminId if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gateway' AND column_name = 'linkedAdminId') THEN
        ALTER TABLE gateway ADD COLUMN "linkedAdminId" uuid;
    END IF;

    -- Add createdById if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gateway' AND column_name = 'createdById') THEN
        ALTER TABLE gateway ADD COLUMN "createdById" uuid;
    END IF;
END $$;

-- Ensure parking_lot has adminId column
ALTER TABLE parking_lot
ADD COLUMN IF NOT EXISTS "adminId" uuid;

-- Add foreign key constraints
ALTER TABLE parking_lot
ADD CONSTRAINT IF NOT EXISTS "FK_parking_lot_admin"
FOREIGN KEY ("adminId") REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE gateway
ADD CONSTRAINT IF NOT EXISTS "FK_gateway_linkedAdmin"
FOREIGN KEY ("linkedAdminId") REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE gateway
ADD CONSTRAINT IF NOT EXISTS "FK_gateway_createdBy"
FOREIGN KEY ("createdById") REFERENCES "user"(id) ON DELETE SET NULL;