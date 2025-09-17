-- Migration: Multiple file attachments for prepayments
-- Changes justification_file (single file) to justification_files (JSON array)

-- Add new column for multiple files
ALTER TABLE prepayments ADD COLUMN justification_files JSONB;

-- Migrate existing single file data to new format
-- Only migrate rows that have a non-null and non-empty justification_file
UPDATE prepayments 
SET justification_files = jsonb_build_array(
  jsonb_build_object(
    'filename', justification_file,
    'original_name', justification_file,
    'file_path', 'storage/uploads/prepayments/' || justification_file
  )
)
WHERE justification_file IS NOT NULL AND justification_file != '';

-- Drop the old single file column
ALTER TABLE prepayments DROP COLUMN justification_file;