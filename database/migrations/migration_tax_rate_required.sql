-- Migration: Make tax rate field required
-- Date: 2025-09-21
-- Description: Update taxes table to make rate field NOT NULL

-- First, update any existing taxes that have NULL rate to 0
UPDATE taxes SET rate = 0.00 WHERE rate IS NULL;

-- Then alter the column to be NOT NULL
ALTER TABLE taxes ALTER COLUMN rate SET NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN taxes.rate IS 'Tax rate as percentage (0-100). Required field.';
