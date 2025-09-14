-- Migration: Remove category-level alert_amount and add alert_message to category_country_alerts

-- 1) Drop obsolete column from expense_categories
ALTER TABLE expense_categories DROP COLUMN IF EXISTS alert_amount;

-- 2) Add alert_message to category_country_alerts
ALTER TABLE category_country_alerts ADD COLUMN IF NOT EXISTS alert_message TEXT;


