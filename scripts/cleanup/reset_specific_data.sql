-- =========================================
-- VIATICOS 2025 - SELECTIVE DATA RESET
-- =========================================
-- This script provides options to reset specific data types
-- Uncomment the sections you want to reset

\echo '🎯 Starting selective data reset...'

-- ===========================================
-- OPTION 1: Reset only expenses and approvals (keep prepayments and reports)
-- ===========================================
-- Uncomment the block below to reset only expenses and their approvals

/*
\echo '🗑️  Resetting expenses and approvals only...'
DELETE FROM expense_rejection_history WHERE expense_id IN (SELECT id FROM expenses);
DELETE FROM approval_history WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM approvals WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM expenses;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
\echo '✅ Expenses and approvals reset complete.'
*/

-- ===========================================
-- OPTION 2: Reset only reports and related data (keep prepayments)
-- ===========================================
-- Uncomment the block below to reset reports, expenses, and approvals but keep prepayments

/*
\echo '🗑️  Resetting reports and related data...'
DELETE FROM expense_rejection_history;
DELETE FROM approval_history WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM approvals WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM expenses;
DELETE FROM travel_expense_reports;
ALTER SEQUENCE travel_expense_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
\echo '✅ Reports and related data reset complete.'
*/

-- ===========================================
-- OPTION 3: Reset only prepayments and related data
-- ===========================================
-- Uncomment the block below to reset prepayments and their related reports

/*
\echo '🗑️  Resetting prepayments and related data...'
DELETE FROM expense_rejection_history;
DELETE FROM approval_history;
DELETE FROM approvals;
DELETE FROM expenses;
DELETE FROM travel_expense_reports;
DELETE FROM prepayments;
ALTER SEQUENCE prepayments_id_seq RESTART WITH 1;
ALTER SEQUENCE travel_expense_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE approvals_id_seq RESTART WITH 1;
ALTER SEQUENCE approval_history_id_seq RESTART WITH 1;
\echo '✅ Prepayments and related data reset complete.'
*/

-- ===========================================
-- OPTION 4: Reset only approval data (keep business data)
-- ===========================================
-- Uncomment the block below to reset only approvals and history

/*
\echo '🗑️  Resetting approval data only...'
DELETE FROM expense_rejection_history;
DELETE FROM approval_history;
DELETE FROM approvals;
-- Reset all reports and expenses to PENDING status
UPDATE travel_expense_reports SET status = 'pending', updated_at = NOW();
UPDATE prepayments SET status = 'pending', updated_at = NOW();
UPDATE expenses SET status = 'pending', updated_at = NOW();
-- Clear rejection reasons
UPDATE expenses SET rejection_reason = NULL;
\echo '✅ Approval data reset complete - all items back to pending status.'
*/

\echo '📝 Selective reset options available:'
\echo '   1. Expenses and approvals only'
\echo '   2. Reports and related data (keep prepayments)'
\echo '   3. Prepayments and all related data'
\echo '   4. Approval data only (reset statuses to pending)'
\echo ''
\echo '💡 Edit this file and uncomment the desired option block to use.'
