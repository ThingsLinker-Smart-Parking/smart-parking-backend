-- Migration to add User profile fields
-- Run this on Railway PostgreSQL database

-- Add new columns to users table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(15);
        RAISE NOTICE 'Added column: phone';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='companyName') THEN
        ALTER TABLE users ADD COLUMN "companyName" VARCHAR(255);
        RAISE NOTICE 'Added column: companyName';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gstNumber') THEN
        ALTER TABLE users ADD COLUMN "gstNumber" VARCHAR(15);
        RAISE NOTICE 'Added column: gstNumber';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
        ALTER TABLE users ADD COLUMN address TEXT;
        RAISE NOTICE 'Added column: address';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
        ALTER TABLE users ADD COLUMN city VARCHAR(100);
        RAISE NOTICE 'Added column: city';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='state') THEN
        ALTER TABLE users ADD COLUMN state VARCHAR(100);
        RAISE NOTICE 'Added column: state';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='zipCode') THEN
        ALTER TABLE users ADD COLUMN "zipCode" VARCHAR(10);
        RAISE NOTICE 'Added column: zipCode';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country') THEN
        ALTER TABLE users ADD COLUMN country VARCHAR(100);
        RAISE NOTICE 'Added column: country';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updatedAt') THEN
        ALTER TABLE users ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added column: updatedAt';
    END IF;
END $$;

-- Create index on phone if it doesn't exist
CREATE INDEX IF NOT EXISTS "IDX_users_phone" ON users (phone);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('phone', 'companyName', 'gstNumber', 'address', 'city', 'state', 'zipCode', 'country', 'updatedAt')
ORDER BY column_name;
