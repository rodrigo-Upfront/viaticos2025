-- Add admin MFA requirement field to users table
-- This migration adds support for admin-forced MFA requirements

ALTER TABLE users ADD COLUMN mfa_required_by_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_mfa_required_by_admin ON users(mfa_required_by_admin);

-- Add comment for documentation
COMMENT ON COLUMN users.mfa_required_by_admin IS 'Flag indicating MFA is required by admin for this user';
