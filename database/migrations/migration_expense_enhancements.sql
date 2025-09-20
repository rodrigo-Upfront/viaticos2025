-- Migration: Expense System Enhancements
-- Adds supplier tax name, tax module, removes comments field, and adds tax selection for expenses

-- 1. Add tax_name field to suppliers (required field)
ALTER TABLE factura_suppliers ADD COLUMN IF NOT EXISTS tax_name VARCHAR(200);

-- Update existing suppliers to have tax_name = name (auto-populate logic)
UPDATE factura_suppliers SET tax_name = name WHERE tax_name IS NULL;

-- Make tax_name NOT NULL after populating
ALTER TABLE factura_suppliers ALTER COLUMN tax_name SET NOT NULL;

-- 2. Create taxes table
CREATE TABLE IF NOT EXISTS taxes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    regime VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add tax_id to expenses table (for taxable invoices)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_id INTEGER REFERENCES taxes(id) ON DELETE SET NULL;

-- 4. Remove comments field from expenses (make nullable first, then drop)
ALTER TABLE expenses ALTER COLUMN comments DROP NOT NULL;
ALTER TABLE expenses DROP COLUMN IF EXISTS comments;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_factura_suppliers_tax_name ON factura_suppliers(tax_name);
CREATE INDEX IF NOT EXISTS idx_taxes_code ON taxes(code);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_id ON expenses(tax_id);

-- Add comments for documentation
COMMENT ON COLUMN factura_suppliers.tax_name IS 'Supplier Tax Name / RUC - required field for tax identification';
COMMENT ON TABLE taxes IS 'Tax codes and regimes for taxable invoices';
COMMENT ON COLUMN taxes.code IS 'Unique tax code identifier';
COMMENT ON COLUMN taxes.regime IS 'Tax regime description';
COMMENT ON COLUMN expenses.tax_id IS 'Tax applied to taxable invoices (FACTURA with taxable=SI)';

-- Sample tax data (common tax types)
INSERT INTO taxes (code, regime) VALUES
    ('IGV', 'Impuesto General a las Ventas - 18%'),
    ('ISC', 'Impuesto Selectivo al Consumo'),
    ('IVAP', 'Impuesto a las Ventas Arroz Pilado'),
    ('ICBPER', 'Impuesto al Consumo de Bolsas de Plástico'),
    ('OTROS', 'Otros Impuestos')
ON CONFLICT (code) DO NOTHING;
