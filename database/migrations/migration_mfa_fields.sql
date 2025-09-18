-- Migration: Add MFA (Multi-Factor Authentication) fields to users table
-- Adds optional MFA support to the Viaticos 2025 system

-- Add MFA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes JSONB NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used TIMESTAMP WITH TIME ZONE NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);

-- Add comments for documentation
COMMENT ON COLUMN users.mfa_enabled IS 'Whether MFA is enabled for this user';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret for MFA authentication';
COMMENT ON COLUMN users.backup_codes IS 'Array of hashed backup codes for MFA recovery';
COMMENT ON COLUMN users.mfa_last_used IS 'Last time MFA was used to prevent replay attacks';

