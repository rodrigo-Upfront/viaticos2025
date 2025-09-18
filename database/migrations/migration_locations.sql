-- Migration: Add Locations and LocationCurrency tables
-- This migration adds support for location management with currency associations

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sap_code VARCHAR(50) NOT NULL UNIQUE,
    cost_center VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_currencies table for location-currency associations
CREATE TABLE IF NOT EXISTS location_currencies (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
    account VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one account per location-currency pair
    CONSTRAINT _location_currency_uc UNIQUE (location_id, currency_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_sap_code ON locations(sap_code);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_location_currencies_location_id ON location_currencies(location_id);
CREATE INDEX IF NOT EXISTS idx_location_currencies_currency_id ON location_currencies(currency_id);

-- Add comments for documentation
COMMENT ON TABLE locations IS 'Master table for company locations/branches';
COMMENT ON COLUMN locations.name IS 'Human-readable name of the location';
COMMENT ON COLUMN locations.sap_code IS 'Unique SAP identifier for the location';
COMMENT ON COLUMN locations.cost_center IS 'Cost center associated with this location';

COMMENT ON TABLE location_currencies IS 'Junction table linking locations with their supported currencies';
COMMENT ON COLUMN location_currencies.account IS 'Account code used for this location-currency combination';

-- Insert some sample locations (safe with ON CONFLICT)
INSERT INTO locations (name, sap_code, cost_center) VALUES
    ('Lima Headquarters', 'LIM001', 'CC-LIMA-HQ'),
    ('Santiago Office', 'SCL001', 'CC-SANTIAGO'),
    ('Bogotá Branch', 'BOG001', 'CC-BOGOTA'),
    ('Mexico City Office', 'MEX001', 'CC-MEXICO')
ON CONFLICT (sap_code) DO NOTHING;

-- Sample location-currency associations with accounts
-- Insert specific combinations only
INSERT INTO location_currencies (location_id, currency_id, account)
SELECT l.id, c.id, 
    l.sap_code || '-' || c.code || '-ACC'
FROM locations l
INNER JOIN currencies c ON 1=1
WHERE (l.sap_code = 'LIM001' AND c.code IN ('PEN', 'USD'))
   OR (l.sap_code = 'SCL001' AND c.code IN ('CLP', 'USD'))
   OR (l.sap_code = 'BOG001' AND c.code IN ('COP', 'USD'))
   OR (l.sap_code = 'MEX001' AND c.code IN ('MXN', 'USD'))
   AND NOT EXISTS (
        SELECT 1 FROM location_currencies lc 
        WHERE lc.location_id = l.id AND lc.currency_id = c.id
    );
