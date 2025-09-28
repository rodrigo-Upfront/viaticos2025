-- QA Migration 03: Verification and Testing
-- This script verifies that all migrations were applied correctly
-- and tests the database integrity

-- ============================================================================
-- PART 1: Schema Verification
-- ============================================================================

-- Check that all required columns exist
SELECT 
    'SCHEMA VERIFICATION' as check_type,
    'Checking required columns exist' as description;

-- Verify factura_suppliers.tax_name exists and is NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'factura_suppliers' 
        AND column_name = 'tax_name' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE '✅ factura_suppliers.tax_name exists and is NOT NULL';
    ELSE
        RAISE EXCEPTION '❌ factura_suppliers.tax_name is missing or nullable';
    END IF;
END $$;

-- Verify approval_history.expense_rejections exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'approval_history' 
        AND column_name = 'expense_rejections'
    ) THEN
        RAISE NOTICE '✅ approval_history.expense_rejections exists';
    ELSE
        RAISE EXCEPTION '❌ approval_history.expense_rejections is missing';
    END IF;
END $$;

-- Verify category_country_alerts has currency_id and alert_message
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'category_country_alerts' 
        AND column_name = 'currency_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'category_country_alerts' 
        AND column_name = 'alert_message'
    ) THEN
        RAISE NOTICE '✅ category_country_alerts has currency_id and alert_message';
    ELSE
        RAISE EXCEPTION '❌ category_country_alerts is missing required columns';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Email System Verification
-- ============================================================================

-- Check that all email tables exist
SELECT 
    'EMAIL SYSTEM VERIFICATION' as check_type,
    'Checking email tables exist' as description;

-- Verify email_templates table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
        RAISE NOTICE '✅ email_templates table exists';
    ELSE
        RAISE EXCEPTION '❌ email_templates table is missing';
    END IF;
END $$;

-- Verify email_notifications table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_notifications') THEN
        RAISE NOTICE '✅ email_notifications table exists';
    ELSE
        RAISE EXCEPTION '❌ email_notifications table is missing';
    END IF;
END $$;

-- Verify smtp_settings table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'smtp_settings') THEN
        RAISE NOTICE '✅ smtp_settings table exists';
    ELSE
        RAISE EXCEPTION '❌ smtp_settings table is missing';
    END IF;
END $$;

-- ============================================================================
-- PART 3: Data Integrity Verification
-- ============================================================================

-- Check that default email templates were created
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM email_templates;
    IF template_count >= 6 THEN
        RAISE NOTICE '✅ Default email templates created (% templates)', template_count;
    ELSE
        RAISE EXCEPTION '❌ Not enough email templates created (expected >= 6, got %)', template_count;
    END IF;
END $$;

-- Check that default SMTP settings were created
DO $$
DECLARE
    smtp_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO smtp_count FROM smtp_settings;
    IF smtp_count >= 1 THEN
        RAISE NOTICE '✅ Default SMTP settings created';
    ELSE
        RAISE EXCEPTION '❌ No SMTP settings found';
    END IF;
END $$;

-- Check that factura_suppliers have valid tax_name values
DO $$
DECLARE
    empty_tax_names INTEGER;
BEGIN
    SELECT COUNT(*) INTO empty_tax_names 
    FROM factura_suppliers 
    WHERE tax_name IS NULL OR tax_name = '';
    
    IF empty_tax_names = 0 THEN
        RAISE NOTICE '✅ All factura_suppliers have valid tax_name values';
    ELSE
        RAISE EXCEPTION '❌ Found % factura_suppliers with empty tax_name', empty_tax_names;
    END IF;
END $$;

-- ============================================================================
-- PART 4: Constraint Verification
-- ============================================================================

-- Check that unique constraints exist
SELECT 
    'CONSTRAINT VERIFICATION' as check_type,
    'Checking unique constraints' as description;

-- Verify category_country_alerts unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '_category_country_currency_alert_uc'
        AND table_name = 'category_country_alerts'
    ) THEN
        RAISE NOTICE '✅ category_country_alerts unique constraint exists';
    ELSE
        RAISE EXCEPTION '❌ category_country_alerts unique constraint is missing';
    END IF;
END $$;

-- Verify email_templates unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE'
        AND table_name = 'email_templates'
    ) THEN
        RAISE NOTICE '✅ email_templates unique constraint exists';
    ELSE
        RAISE EXCEPTION '❌ email_templates unique constraint is missing';
    END IF;
END $$;

-- ============================================================================
-- PART 5: Index Verification
-- ============================================================================

-- Check that performance indexes exist
SELECT 
    'INDEX VERIFICATION' as check_type,
    'Checking performance indexes' as description;

-- List all email-related indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_email_%'
ORDER BY indexname;

-- ============================================================================
-- PART 6: Migration Summary Report
-- ============================================================================

-- Generate final migration report
SELECT 
    '============================================' as separator
UNION ALL
SELECT 
    'QA MIGRATION VERIFICATION COMPLETE' as status
UNION ALL
SELECT 
    '============================================' as separator
UNION ALL
SELECT 
    'Migration completed at: ' || NOW()::text as timestamp
UNION ALL
SELECT 
    '============================================' as separator;

-- Show table counts for verification
SELECT 
    'TABLE COUNTS' as section,
    '' as table_name,
    '' as record_count
UNION ALL
SELECT 
    '',
    'email_templates',
    COUNT(*)::text
FROM email_templates
UNION ALL
SELECT 
    '',
    'email_notifications', 
    COUNT(*)::text
FROM email_notifications
UNION ALL
SELECT 
    '',
    'smtp_settings',
    COUNT(*)::text
FROM smtp_settings
UNION ALL
SELECT 
    '',
    'factura_suppliers',
    COUNT(*)::text
FROM factura_suppliers
UNION ALL
SELECT 
    '',
    'category_country_alerts',
    COUNT(*)::text
FROM category_country_alerts;

-- Show any potential issues
SELECT 
    'POTENTIAL ISSUES CHECK' as section,
    '' as issue_type,
    '' as count
UNION ALL
SELECT 
    '',
    'Empty tax_name in factura_suppliers',
    COUNT(*)::text
FROM factura_suppliers 
WHERE tax_name IS NULL OR tax_name = ''
UNION ALL
SELECT 
    '',
    'NULL location_id in expense_categories',
    COUNT(*)::text
FROM expense_categories 
WHERE location_id IS NULL
UNION ALL
SELECT 
    '',
    'Disabled email templates',
    COUNT(*)::text
FROM email_templates 
WHERE enabled = false;
