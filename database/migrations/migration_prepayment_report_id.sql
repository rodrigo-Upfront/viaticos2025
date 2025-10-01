-- Migration: Add report_id to prepayments table
-- Purpose: Reserve report ID during SAP file generation for use in report creation
-- Date: 2025-10-01

-- Add report_id column to prepayments
ALTER TABLE prepayments ADD COLUMN IF NOT EXISTS report_id INTEGER;

-- Backfill report_id for existing prepayments that have linked reports
UPDATE prepayments p
SET report_id = ter.id
FROM travel_expense_reports ter
WHERE ter.prepayment_id = p.id
  AND p.report_id IS NULL;

-- Add helpful comment
COMMENT ON COLUMN prepayments.report_id IS 'Reserved report ID (populated when SAP file is generated, used when creating the expense report)';

