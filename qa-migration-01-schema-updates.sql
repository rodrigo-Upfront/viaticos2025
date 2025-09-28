-- QA Migration 01: Schema Updates for Existing Tables
-- This script safely adds missing columns and constraints to existing tables
-- All changes are backwards compatible and preserve existing data

-- ============================================================================
-- PART 1: Add missing columns to existing tables
-- ============================================================================

-- Add tax_name column to factura_suppliers if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'factura_suppliers' AND column_name = 'tax_name'
    ) THEN
        ALTER TABLE factura_suppliers ADD COLUMN tax_name VARCHAR(200) DEFAULT '';
        RAISE NOTICE 'Added tax_name column to factura_suppliers';
    ELSE
        RAISE NOTICE 'tax_name column already exists in factura_suppliers';
    END IF;
END $$;

-- Update empty tax_name values to use supplier name as default
UPDATE factura_suppliers 
SET tax_name = name 
WHERE tax_name = '' OR tax_name IS NULL;

-- Make tax_name NOT NULL after setting defaults
ALTER TABLE factura_suppliers ALTER COLUMN tax_name SET NOT NULL;

-- ============================================================================
-- PART 2: Add missing columns to approval_history
-- ============================================================================

-- Add expense_rejections column to approval_history if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_history' AND column_name = 'expense_rejections'
    ) THEN
        ALTER TABLE approval_history ADD COLUMN expense_rejections TEXT;
        RAISE NOTICE 'Added expense_rejections column to approval_history';
    ELSE
        RAISE NOTICE 'expense_rejections column already exists in approval_history';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Add missing columns to category_country_alerts
-- ============================================================================

-- Add currency_id column to category_country_alerts if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'category_country_alerts' AND column_name = 'currency_id'
    ) THEN
        ALTER TABLE category_country_alerts ADD COLUMN currency_id INTEGER;
        RAISE NOTICE 'Added currency_id column to category_country_alerts';
    ELSE
        RAISE NOTICE 'currency_id column already exists in category_country_alerts';
    END IF;
END $$;

-- Add alert_message column to category_country_alerts if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'category_country_alerts' AND column_name = 'alert_message'
    ) THEN
        ALTER TABLE category_country_alerts ADD COLUMN alert_message TEXT;
        RAISE NOTICE 'Added alert_message column to category_country_alerts';
    ELSE
        RAISE NOTICE 'alert_message column already exists in category_country_alerts';
    END IF;
END $$;

-- Add foreign key constraint for currency_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_country_alerts_currency_id_fkey'
    ) THEN
        ALTER TABLE category_country_alerts 
        ADD CONSTRAINT category_country_alerts_currency_id_fkey 
        FOREIGN KEY (currency_id) REFERENCES currencies(id);
        RAISE NOTICE 'Added foreign key constraint for currency_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for currency_id already exists';
    END IF;
END $$;

-- Update unique constraint to include currency_id
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '_category_country_alert_uc'
    ) THEN
        ALTER TABLE category_country_alerts DROP CONSTRAINT _category_country_alert_uc;
        RAISE NOTICE 'Dropped old unique constraint _category_country_alert_uc';
    END IF;
    
    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '_category_country_currency_alert_uc'
    ) THEN
        ALTER TABLE category_country_alerts 
        ADD CONSTRAINT _category_country_currency_alert_uc 
        UNIQUE (category_id, country_id, currency_id);
        RAISE NOTICE 'Added new unique constraint _category_country_currency_alert_uc';
    ELSE
        RAISE NOTICE 'New unique constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 4: Fix expense_categories location_id issues
-- ============================================================================

-- Make location_id NOT NULL for expense_categories (after cleaning up NULL values)
-- First, delete any categories with NULL location_id (these are orphaned)
DELETE FROM expense_categories WHERE location_id IS NULL;

-- Then make the column NOT NULL
DO $$
BEGIN
    -- Check if column is already NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expense_categories' 
        AND column_name = 'location_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE expense_categories ALTER COLUMN location_id SET NOT NULL;
        RAISE NOTICE 'Set location_id to NOT NULL in expense_categories';
    ELSE
        RAISE NOTICE 'location_id is already NOT NULL in expense_categories';
    END IF;
END $$;

-- ============================================================================
-- PART 5: Add missing columns to travel_expense_reports (for reimbursements)
-- ============================================================================

-- Add reason column for reimbursement reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_expense_reports' AND column_name = 'reason'
    ) THEN
        ALTER TABLE travel_expense_reports ADD COLUMN reason TEXT;
        RAISE NOTICE 'Added reason column to travel_expense_reports';
    ELSE
        RAISE NOTICE 'reason column already exists in travel_expense_reports';
    END IF;
END $$;

-- Add country_id column for reimbursement reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_expense_reports' AND column_name = 'country_id'
    ) THEN
        ALTER TABLE travel_expense_reports ADD COLUMN country_id INTEGER REFERENCES countries(id);
        RAISE NOTICE 'Added country_id column to travel_expense_reports';
    ELSE
        RAISE NOTICE 'country_id column already exists in travel_expense_reports';
    END IF;
END $$;

-- Add currency_id column for reimbursement reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_expense_reports' AND column_name = 'currency_id'
    ) THEN
        ALTER TABLE travel_expense_reports ADD COLUMN currency_id INTEGER REFERENCES currencies(id);
        RAISE NOTICE 'Added currency_id column to travel_expense_reports';
    ELSE
        RAISE NOTICE 'currency_id column already exists in travel_expense_reports';
    END IF;
END $$;

-- Add start_date and end_date for reimbursement reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_expense_reports' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE travel_expense_reports ADD COLUMN start_date DATE;
        RAISE NOTICE 'Added start_date column to travel_expense_reports';
    ELSE
        RAISE NOTICE 'start_date column already exists in travel_expense_reports';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'travel_expense_reports' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE travel_expense_reports ADD COLUMN end_date DATE;
        RAISE NOTICE 'Added end_date column to travel_expense_reports';
    ELSE
        RAISE NOTICE 'end_date column already exists in travel_expense_reports';
    END IF;
END $$;

-- ============================================================================
-- PART 6: Add rejection_reason to prepayments
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prepayments' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE prepayments ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason column to prepayments';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists in prepayments';
    END IF;
END $$;

-- ============================================================================
-- PART 7: Add rejection_reason to expenses
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE expenses ADD COLUMN rejection_reason VARCHAR(300);
        RAISE NOTICE 'Added rejection_reason column to expenses';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists in expenses';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all changes were applied successfully
SELECT 
    'Schema Updates Complete' as status,
    NOW() as completed_at;

-- Show summary of changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN (
    'factura_suppliers', 
    'approval_history', 
    'category_country_alerts', 
    'travel_expense_reports',
    'prepayments',
    'expenses'
) 
AND column_name IN (
    'tax_name', 
    'expense_rejections', 
    'currency_id', 
    'alert_message',
    'reason',
    'country_id',
    'start_date',
    'end_date',
    'rejection_reason'
)
ORDER BY table_name, column_name;
