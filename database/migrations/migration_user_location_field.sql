-- Migration: Add location_id field to users table
-- This migration adds optional location association for users

-- Add location_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);

-- Add comment for documentation
COMMENT ON COLUMN users.location_id IS 'Optional reference to the location/office where the user is based';

-- Sample data: Associate some users with locations (optional - can be updated later via UI)
-- Update test users to have locations (only if locations exist)
UPDATE users 
SET location_id = (
    CASE 
        WHEN email LIKE '%lima%' OR email = 'test@test.com' THEN (SELECT id FROM locations WHERE sap_code = 'LIM001' LIMIT 1)
        WHEN email LIKE '%santiago%' THEN (SELECT id FROM locations WHERE sap_code = 'SCL001' LIMIT 1)
        WHEN email LIKE '%bogota%' THEN (SELECT id FROM locations WHERE sap_code = 'BOG001' LIMIT 1)
        WHEN email LIKE '%mexico%' THEN (SELECT id FROM locations WHERE sap_code = 'MEX001' LIMIT 1)
        ELSE NULL
    END
)
WHERE location_id IS NULL
AND EXISTS (SELECT 1 FROM locations LIMIT 1);
