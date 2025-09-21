-- Migration: Add location_id to expense_categories and migrate existing data
-- This migration makes expense categories location-specific

-- Step 1: Add location_id column (nullable initially for migration)
ALTER TABLE expense_categories ADD COLUMN location_id INTEGER;

-- Step 2: Add foreign key constraint (but not enforced yet)
ALTER TABLE expense_categories ADD CONSTRAINT fk_expense_categories_location 
    FOREIGN KEY (location_id) REFERENCES locations(id);

-- Step 3: Assign all existing categories to the first location (lowest ID)
-- If no locations exist, this will fail and needs manual intervention
UPDATE expense_categories 
SET location_id = (SELECT MIN(id) FROM locations WHERE id IS NOT NULL)
WHERE location_id IS NULL;

-- Step 4: Make location_id NOT NULL now that all categories have a location
ALTER TABLE expense_categories ALTER COLUMN location_id SET NOT NULL;

-- Step 5: Drop the old unique constraint on name (since categories are now location-specific)
ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_name_key;

-- Step 6: Add new unique constraint for name per location
ALTER TABLE expense_categories ADD CONSTRAINT _category_location_uc 
    UNIQUE (name, location_id);

-- Step 7: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_location_id ON expense_categories(location_id);

-- Add comments for documentation
COMMENT ON COLUMN expense_categories.location_id IS 'Foreign key to locations table - categories are now location-specific';
COMMENT ON CONSTRAINT _category_location_uc ON expense_categories IS 'Unique constraint ensuring category names are unique within each location';
