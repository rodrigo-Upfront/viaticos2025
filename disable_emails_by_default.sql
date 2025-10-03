-- Disable email notifications by default
-- This sets is_active to false in SMTP settings
-- You can enable it later through the UI toggle

UPDATE smtp_settings 
SET is_active = false 
WHERE is_active = true;

-- Check the result
SELECT id, smtp_host, from_email, is_active, created_at 
FROM smtp_settings;


