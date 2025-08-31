-- =========================================
-- VIATICOS 2025 - COMPLETE DATA RESET
-- =========================================
-- This script removes ALL transactional data while preserving master data
-- WARNING: This will delete all prepayments, reports, expenses, and approvals
-- Master data (users, categories, countries, currencies, suppliers) will be preserved

\echo '🧹 Starting complete data reset...'

-- Disable foreign key checks temporarily for faster cleanup
SET session_replication_role = replica;

\echo '📊 Current data counts (before cleanup):'
SELECT 'Prepayments' as table_name, COUNT(*) as count FROM prepayments
UNION ALL
SELECT 'Travel Expense Reports', COUNT(*) FROM travel_expense_reports
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Approvals', COUNT(*) FROM approvals
UNION ALL
SELECT 'Approval History', COUNT(*) FROM approval_history
UNION ALL
SELECT 'Expense Rejection History', COUNT(*) FROM expense_rejection_history;

\echo '🗑️  Deleting transactional data...'

-- Delete in dependency order to maintain referential integrity
DELETE FROM expense_rejection_history;
DELETE FROM approval_history;
DELETE FROM approvals;
DELETE FROM expenses;
DELETE FROM travel_expense_reports;
DELETE FROM prepayments;

\echo '🔄 Resetting auto-increment sequences...'

-- Reset sequences to start from 1
ALTER SEQUENCE prepayments_id_seq RESTART WITH 1;
ALTER SEQUENCE travel_expense_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE approvals_id_seq RESTART WITH 1;
ALTER SEQUENCE approval_history_id_seq RESTART WITH 1;
ALTER SEQUENCE expense_rejection_history_id_seq RESTART WITH 1;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

\echo '✅ Verifying cleanup completion:'
SELECT 'Prepayments' as table_name, COUNT(*) as remaining_count FROM prepayments
UNION ALL
SELECT 'Travel Expense Reports', COUNT(*) FROM travel_expense_reports
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Approvals', COUNT(*) FROM approvals
UNION ALL
SELECT 'Approval History', COUNT(*) FROM approval_history
UNION ALL
SELECT 'Expense Rejection History', COUNT(*) FROM expense_rejection_history;

\echo '📋 Master data preserved:'
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Categories', COUNT(*) FROM expense_categories
UNION ALL
SELECT 'Countries', COUNT(*) FROM countries
UNION ALL
SELECT 'Currencies', COUNT(*) FROM currencies
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM factura_suppliers;

\echo '🎉 Complete data reset finished successfully!'
\echo '🚀 System ready for fresh testing.'
