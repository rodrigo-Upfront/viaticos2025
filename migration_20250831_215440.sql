-- Migration script for granular approval workflow deployment
-- Date: $(date)
-- Description: Add REJECTED status to ExpenseStatus enum

-- Add REJECTED value to ExpenseStatus enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'expensestatus')
        AND enumlabel = 'REJECTED'
    ) THEN
        ALTER TYPE expensestatus ADD VALUE 'REJECTED';
    END IF;
END $$;

-- Add rejection_reason column to expenses if it doesn't exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300);

-- Add rejection_reason column to travel_expense_reports if it doesn't exist  
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300);

-- Verify the changes
SELECT 'ExpenseStatus enum values:' as check_type;
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'expensestatus') ORDER BY enumsortorder;

SELECT 'Expenses table columns:' as check_type;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'expenses' AND column_name IN ('rejection_reason', 'status');

SELECT 'Travel expense reports table columns:' as check_type;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'travel_expense_reports' AND column_name = 'rejection_reason';
