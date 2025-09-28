-- QA Migration Rollback Script
-- This script can be used to rollback the email system migration if needed
-- WARNING: This will remove all email functionality and related data

-- ============================================================================
-- ROLLBACK CONFIRMATION
-- ============================================================================

-- Uncomment the following line to confirm you want to rollback
-- SET @CONFIRM_ROLLBACK = 'YES_I_WANT_TO_ROLLBACK';

DO $$
BEGIN
    -- Check for confirmation (this will fail if not set, preventing accidental rollback)
    IF current_setting('my.confirm_rollback', true) != 'YES_I_WANT_TO_ROLLBACK' THEN
        RAISE EXCEPTION 'Rollback not confirmed. Set my.confirm_rollback to YES_I_WANT_TO_ROLLBACK to proceed.';
    END IF;
    
    RAISE NOTICE 'Rollback confirmed. Proceeding with rollback...';
END $$;

-- ============================================================================
-- PART 1: Drop Email System Tables
-- ============================================================================

-- Drop email system tables (these are safe to drop as they're new)
DROP TABLE IF EXISTS email_notifications CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS smtp_settings CASCADE;

RAISE NOTICE 'Dropped email system tables';

-- ============================================================================
-- PART 2: Rollback Schema Changes (CAREFUL - These affect existing tables)
-- ============================================================================

-- Note: Column drops are commented out as they may contain data
-- Uncomment only if you're sure you want to lose this data

-- Rollback category_country_alerts changes
-- ALTER TABLE category_country_alerts DROP COLUMN IF EXISTS alert_message;
-- ALTER TABLE category_country_alerts DROP COLUMN IF EXISTS currency_id;

-- Restore old unique constraint
DO $$
BEGIN
    -- Drop new constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '_category_country_currency_alert_uc'
    ) THEN
        ALTER TABLE category_country_alerts DROP CONSTRAINT _category_country_currency_alert_uc;
        RAISE NOTICE 'Dropped new unique constraint';
    END IF;
    
    -- Restore old constraint (if needed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '_category_country_alert_uc'
    ) THEN
        ALTER TABLE category_country_alerts 
        ADD CONSTRAINT _category_country_alert_uc 
        UNIQUE (category_id, country_id);
        RAISE NOTICE 'Restored old unique constraint';
    END IF;
END $$;

-- Rollback factura_suppliers changes
-- Note: We don't drop tax_name as it may contain important data
-- ALTER TABLE factura_suppliers DROP COLUMN IF EXISTS tax_name;

-- Rollback approval_history changes
-- ALTER TABLE approval_history DROP COLUMN IF EXISTS expense_rejections;

-- Rollback travel_expense_reports changes
-- ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS reason;
-- ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS country_id;
-- ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS currency_id;
-- ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS start_date;
-- ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS end_date;

-- Rollback prepayments changes
-- ALTER TABLE prepayments DROP COLUMN IF EXISTS rejection_reason;

-- Rollback expenses changes
-- ALTER TABLE expenses DROP COLUMN IF EXISTS rejection_reason;

-- ============================================================================
-- PART 3: Drop Indexes
-- ============================================================================

-- Drop email-related indexes
DROP INDEX IF EXISTS idx_email_notifications_status;
DROP INDEX IF EXISTS idx_email_notifications_event_type;
DROP INDEX IF EXISTS idx_email_notifications_created_at;
DROP INDEX IF EXISTS idx_email_templates_event_language;

RAISE NOTICE 'Dropped email system indexes';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify rollback completed
SELECT 
    'ROLLBACK VERIFICATION' as check_type,
    'Checking tables were dropped' as description;

-- Check that email tables no longer exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
        RAISE NOTICE '✅ email_templates table removed';
    ELSE
        RAISE WARNING '❌ email_templates table still exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_notifications') THEN
        RAISE NOTICE '✅ email_notifications table removed';
    ELSE
        RAISE WARNING '❌ email_notifications table still exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smtp_settings') THEN
        RAISE NOTICE '✅ smtp_settings table removed';
    ELSE
        RAISE WARNING '❌ smtp_settings table still exists';
    END IF;
END $$;

-- Generate rollback report
SELECT 
    '============================================' as separator
UNION ALL
SELECT 
    'QA MIGRATION ROLLBACK COMPLETE' as status
UNION ALL
SELECT 
    '============================================' as separator
UNION ALL
SELECT 
    'Rollback completed at: ' || NOW()::text as timestamp
UNION ALL
SELECT 
    '============================================' as separator;

-- Show remaining tables to verify core system is intact
SELECT 
    'REMAINING CORE TABLES' as section,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
