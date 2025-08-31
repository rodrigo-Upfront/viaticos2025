-- =========================================
-- VIATICOS 2025 - TEST DATA CLEANUP SCRIPT
-- =========================================
-- This script removes all test data to start fresh
-- Run this AFTER completing manual verification tests

-- 1. Delete all approval history (maintains referential integrity)
DELETE FROM approval_history;

-- 2. Delete all expense rejection history
DELETE FROM expense_rejection_history;

-- 3. Delete all approvals
DELETE FROM approvals;

-- 4. Delete all expenses
DELETE FROM expenses;

-- 5. Delete all travel expense reports
DELETE FROM travel_expense_reports;

-- 6. Delete all prepayments
DELETE FROM prepayments;

-- 7. Reset auto-increment sequences to start from 1
ALTER SEQUENCE prepayments_id_seq RESTART WITH 1;
ALTER SEQUENCE travel_expense_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE approvals_id_seq RESTART WITH 1;
ALTER SEQUENCE approval_history_id_seq RESTART WITH 1;
ALTER SEQUENCE expense_rejection_history_id_seq RESTART WITH 1;

-- 8. Verify cleanup (should all return 0)
SELECT 'Prepayments count:' as table_name, COUNT(*) as count FROM prepayments
UNION ALL
SELECT 'Reports count:', COUNT(*) FROM travel_expense_reports
UNION ALL
SELECT 'Expenses count:', COUNT(*) FROM expenses
UNION ALL
SELECT 'Approvals count:', COUNT(*) FROM approvals
UNION ALL
SELECT 'Approval history count:', COUNT(*) FROM approval_history
UNION ALL
SELECT 'Expense rejections count:', COUNT(*) FROM expense_rejection_history;

-- =========================================
-- CLEANUP COMPLETE
-- =========================================
