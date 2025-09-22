-- Migration: Credit Card Statement Import System
-- Date: 2025-09-22
-- Description: Add credit card statement import functionality with transaction consolidation

-- Create credit_card_statements table
CREATE TABLE IF NOT EXISTS credit_card_statements (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'UPLOADED' NOT NULL,
    total_records INTEGER,
    processed_records INTEGER,
    validation_errors JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_card_transactions table
CREATE TABLE IF NOT EXISTS credit_card_transactions (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER NOT NULL REFERENCES credit_card_statements(id) ON DELETE CASCADE,
    credit_card_number VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    merchant VARCHAR(255),
    description TEXT,
    raw_data JSON,
    matched_user_id INTEGER REFERENCES users(id),
    consolidated_expense_id INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_card_consolidated_expenses table
CREATE TABLE IF NOT EXISTS credit_card_consolidated_expenses (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER NOT NULL REFERENCES credit_card_statements(id) ON DELETE CASCADE,
    credit_card_number VARCHAR(50) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    expense_description VARCHAR(500) NOT NULL,
    supplier_name VARCHAR(200) NOT NULL,
    transaction_count INTEGER NOT NULL,
    source_transaction_ids JSON NOT NULL,
    matched_user_id INTEGER NOT NULL REFERENCES users(id),
    associated_prepayment_id INTEGER REFERENCES prepayments(id),
    created_expense_id INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for consolidated_expense_id after table creation
ALTER TABLE credit_card_transactions 
ADD CONSTRAINT fk_consolidated_expense 
FOREIGN KEY (consolidated_expense_id) REFERENCES credit_card_consolidated_expenses(id);

-- Add foreign key constraint for created_expense_id after expense table modifications
ALTER TABLE credit_card_consolidated_expenses 
ADD CONSTRAINT fk_created_expense 
FOREIGN KEY (created_expense_id) REFERENCES expenses(id);

-- Modify expenses table to support credit card imports
-- Make previously required fields nullable for credit card imports
ALTER TABLE expenses ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN purpose DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN document_number DROP NOT NULL;

-- Add credit card import tracking fields to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_source VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS credit_card_expense_id INTEGER;

-- Add foreign key constraint for credit_card_expense_id
ALTER TABLE expenses 
ADD CONSTRAINT fk_credit_card_expense 
FOREIGN KEY (credit_card_expense_id) REFERENCES credit_card_consolidated_expenses(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_uploaded_by ON credit_card_statements(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_status ON credit_card_statements(status);

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_statement ON credit_card_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_card_number ON credit_card_transactions(credit_card_number);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user ON credit_card_transactions(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_status ON credit_card_transactions(status);

CREATE INDEX IF NOT EXISTS idx_consolidated_expenses_statement ON credit_card_consolidated_expenses(statement_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_expenses_user ON credit_card_consolidated_expenses(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_expenses_prepayment ON credit_card_consolidated_expenses(associated_prepayment_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_expenses_status ON credit_card_consolidated_expenses(status);

CREATE INDEX IF NOT EXISTS idx_expenses_import_source ON expenses(import_source);
CREATE INDEX IF NOT EXISTS idx_expenses_credit_card_expense ON expenses(credit_card_expense_id);

-- Add comments for documentation
COMMENT ON TABLE credit_card_statements IS 'Uploaded credit card statement files with processing status';
COMMENT ON TABLE credit_card_transactions IS 'Individual transactions from credit card statements';
COMMENT ON TABLE credit_card_consolidated_expenses IS 'Consolidated expenses ready for prepayment creation';
COMMENT ON COLUMN expenses.import_source IS 'Source of expense creation: MANUAL or CREDIT_CARD';
COMMENT ON COLUMN expenses.credit_card_expense_id IS 'Reference to consolidated credit card expense if imported';
