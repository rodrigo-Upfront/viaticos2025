-- Migration: Accounting Approval Enhancement
-- Adds fields for 4-step accounting approval process with SAP file generation

-- Add rate field to taxes table
ALTER TABLE taxes 
ADD COLUMN IF NOT EXISTS rate DECIMAL(5,2) NULL;

-- Add SAP invoice number to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS sap_invoice_number VARCHAR(50) NULL;

-- Add SAP fields to travel_expense_reports table
ALTER TABLE travel_expense_reports 
ADD COLUMN IF NOT EXISTS sap_expenses_file VARCHAR(500) NULL;

ALTER TABLE travel_expense_reports 
ADD COLUMN IF NOT EXISTS sap_compensation_file VARCHAR(500) NULL;

ALTER TABLE travel_expense_reports 
ADD COLUMN IF NOT EXISTS sap_compensation_number VARCHAR(50) NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_sap_invoice_number ON expenses(sap_invoice_number);
CREATE INDEX IF NOT EXISTS idx_reports_sap_compensation_number ON travel_expense_reports(sap_compensation_number);

-- Add comments for documentation
COMMENT ON COLUMN taxes.rate IS 'Tax rate as percentage (e.g., 18.00 for 18%)';
COMMENT ON COLUMN expenses.sap_invoice_number IS 'SAP invoice number entered during accounting approval (for FACTURA expenses only)';
COMMENT ON COLUMN travel_expense_reports.sap_expenses_file IS 'Path to generated SAP expenses report file';
COMMENT ON COLUMN travel_expense_reports.sap_compensation_file IS 'Path to generated SAP compensation report file';
COMMENT ON COLUMN travel_expense_reports.sap_compensation_number IS 'SAP compensation number entered during accounting approval';

-- Update existing tax records with sample rates (adjust as needed)
UPDATE taxes SET rate = 18.00 WHERE code = 'IGV' AND rate IS NULL;
UPDATE taxes SET rate = 0.00 WHERE rate IS NULL;
