-- Migration: Fund Return Workflow Implementation
-- Date: 2025-01-01
-- Description: Add new status values and fund return fields for enhanced report approval workflow

-- Add new enum values to RequestStatus
DO $$
BEGIN
    -- Add REVIEW_RETURN status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'requeststatus')
        AND enumlabel = 'REVIEW_RETURN'
    ) THEN
        ALTER TYPE requeststatus ADD VALUE 'REVIEW_RETURN';
    END IF;
    
    -- Add APPROVED_EXPENSES status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'requeststatus')
        AND enumlabel = 'APPROVED_EXPENSES'
    ) THEN
        ALTER TYPE requeststatus ADD VALUE 'APPROVED_EXPENSES';
    END IF;
    
    -- Add APPROVED_REPAID status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'requeststatus')
        AND enumlabel = 'APPROVED_REPAID'
    ) THEN
        ALTER TYPE requeststatus ADD VALUE 'APPROVED_REPAID';
    END IF;
    
    -- Add APPROVED_RETURNED_FUNDS status
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'requeststatus')
        AND enumlabel = 'APPROVED_RETURNED_FUNDS'
    ) THEN
        ALTER TYPE requeststatus ADD VALUE 'APPROVED_RETURNED_FUNDS';
    END IF;
END $$;

-- Add fund return fields to travel_expense_reports table
ALTER TABLE travel_expense_reports 
ADD COLUMN IF NOT EXISTS return_document_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS return_document_files JSON;

-- Create index for better performance on fund return queries
CREATE INDEX IF NOT EXISTS idx_travel_expense_reports_return_status 
ON travel_expense_reports(status) 
WHERE status IN ('FUNDS_RETURN_PENDING', 'REVIEW_RETURN');

-- Migrate existing APPROVED reports to new specific statuses
-- Note: This is a one-time migration for existing data
-- For safety, we'll keep existing APPROVED status as APPROVED_EXPENSES for now
-- Manual review may be needed for proper categorization

UPDATE travel_expense_reports 
SET status = 'APPROVED_EXPENSES'
WHERE status = 'APPROVED' 
AND prepayment_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN travel_expense_reports.return_document_number IS 'Document reference number for fund return process';
COMMENT ON COLUMN travel_expense_reports.return_document_files IS 'JSON array of file paths for fund return supporting documents';

-- Create storage directory structure (to be created by application)
-- /storage/uploads/reports/fund-returns/{report_id}/

COMMIT;
