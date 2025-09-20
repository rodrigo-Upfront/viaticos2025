-- Migration: Treasury Approval Enhancement
-- Adds fields for 2-step treasury approval process with SAP file generation

-- Add new columns to prepayments table
ALTER TABLE prepayments 
ADD COLUMN IF NOT EXISTS deposit_number VARCHAR(20) NULL;

ALTER TABLE prepayments 
ADD COLUMN IF NOT EXISTS sap_prepayment_file VARCHAR(500) NULL;

ALTER TABLE prepayments 
ADD COLUMN IF NOT EXISTS sap_record_number VARCHAR(20) NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prepayments_deposit_number ON prepayments(deposit_number);
CREATE INDEX IF NOT EXISTS idx_prepayments_sap_record_number ON prepayments(sap_record_number);

-- Add comments for documentation
COMMENT ON COLUMN prepayments.deposit_number IS 'Treasury deposit number entered during approval process';
COMMENT ON COLUMN prepayments.sap_prepayment_file IS 'Path to generated SAP prepayment file';
COMMENT ON COLUMN prepayments.sap_record_number IS 'SAP record number entered after file processing';

-- Note: No sample data needed as these fields are populated during the approval workflow
