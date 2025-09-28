-- QA Migration 02: Email System Tables
-- This script creates all email-related tables and initial data
-- These are completely new tables that won't affect existing data

-- ============================================================================
-- PART 1: Create Email Templates Table
-- ============================================================================

-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    language VARCHAR(5) NOT NULL, -- 'es' or 'en'
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_type, language)
);

-- ============================================================================
-- PART 2: Create Email Notifications Table
-- ============================================================================

-- Create email_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    language VARCHAR(5) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Create SMTP Settings Table
-- ============================================================================

-- Create smtp_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS smtp_settings (
    id SERIAL PRIMARY KEY,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_user VARCHAR(255),
    smtp_password VARCHAR(255),
    use_tls BOOLEAN DEFAULT true,
    use_ssl BOOLEAN DEFAULT false,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) DEFAULT 'Viaticos System',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Create Indexes for Performance
-- ============================================================================

-- Create indexes if they don't exist
DO $$
BEGIN
    -- Index for email notifications status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_notifications_status') THEN
        CREATE INDEX idx_email_notifications_status ON email_notifications(status);
        RAISE NOTICE 'Created index idx_email_notifications_status';
    END IF;
    
    -- Index for email notifications event type
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_notifications_event_type') THEN
        CREATE INDEX idx_email_notifications_event_type ON email_notifications(event_type);
        RAISE NOTICE 'Created index idx_email_notifications_event_type';
    END IF;
    
    -- Index for email notifications created_at
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_notifications_created_at') THEN
        CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);
        RAISE NOTICE 'Created index idx_email_notifications_created_at';
    END IF;
    
    -- Index for email templates event and language
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_templates_event_language') THEN
        CREATE INDEX idx_email_templates_event_language ON email_templates(event_type, language);
        RAISE NOTICE 'Created index idx_email_templates_event_language';
    END IF;
END $$;

-- ============================================================================
-- PART 5: Insert Default SMTP Settings (Placeholder)
-- ============================================================================

-- Insert default SMTP settings if none exist
INSERT INTO smtp_settings (
    smtp_host, 
    smtp_port, 
    smtp_user, 
    from_email, 
    from_name,
    use_tls,
    is_active
) 
SELECT 
    'localhost',
    1025,
    '',
    'noreply@viaticos.com',
    'Viaticos System',
    false,
    true
WHERE NOT EXISTS (SELECT 1 FROM smtp_settings);

-- ============================================================================
-- PART 6: Insert Default Email Templates
-- ============================================================================

-- Insert default email templates for prepayment notifications
INSERT INTO email_templates (event_type, language, subject_template, body_template, enabled) VALUES 
-- Spanish templates
('prepayment_pending', 'es', 'Plataforma de Viajes: Solicitud de Anticipo pendiente de aprobación', 
'<p>Hola {recipient.profile},</p>
<br>
<p>El colaborador {user.name} ha enviado la solicitud de anticipo {prepayment.reason} para su aprobación.</p>
<br>
<p>Puede revisar el detalle en el siguiente enlace: <a href="http://localhost:3000{prepayment.approval_url}">Ver solicitud</a></p>
<br>
<p>Gracias</p>', 
true),

('prepayment_approved', 'es', 'Plataforma de Viajes: Solicitud de Anticipo aprobada', 
'<p>Hola {user.name},</p>
<br>
<p>Su solicitud de anticipo {prepayment.reason} ha sido aprobada.</p>
<br>
<p>Puede revisar el detalle en el siguiente enlace: <a href="http://localhost:3000{prepayment.view_url}">Ver solicitud</a></p>
<br>
<p>Gracias</p>', 
true),

('prepayment_rejected', 'es', 'Plataforma de Viajes: Solicitud de Anticipo rechazada', 
'<p>Hola {user.name},</p>
<br>
<p>Su solicitud de anticipo {prepayment.reason} ha sido rechazada.</p>
<br>
<p>Motivo: {prepayment.rejection_reason}</p>
<br>
<p>Puede revisar el detalle en el siguiente enlace: <a href="http://localhost:3000{prepayment.view_url}">Ver solicitud</a></p>
<br>
<p>Gracias</p>', 
true),

-- English templates
('prepayment_pending', 'en', 'Travel Platform: Prepayment Request pending approval', 
'<p>Hello {recipient.profile},</p>
<br>
<p>Employee {user.name} has submitted prepayment request {prepayment.reason} for your approval.</p>
<br>
<p>You can review the details at the following link: <a href="http://localhost:3000{prepayment.approval_url}">View request</a></p>
<br>
<p>Thank you</p>', 
true),

('prepayment_approved', 'en', 'Travel Platform: Prepayment Request approved', 
'<p>Hello {user.name},</p>
<br>
<p>Your prepayment request {prepayment.reason} has been approved.</p>
<br>
<p>You can review the details at the following link: <a href="http://localhost:3000{prepayment.view_url}">View request</a></p>
<br>
<p>Thank you</p>', 
true),

('prepayment_rejected', 'en', 'Travel Platform: Prepayment Request rejected', 
'<p>Hello {user.name},</p>
<br>
<p>Your prepayment request {prepayment.reason} has been rejected.</p>
<br>
<p>Reason: {prepayment.rejection_reason}</p>
<br>
<p>You can review the details at the following link: <a href="http://localhost:3000{prepayment.view_url}">View request</a></p>
<br>
<p>Thank you</p>', 
true)

ON CONFLICT (event_type, language) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all email tables were created successfully
SELECT 
    'Email System Tables Created' as status,
    NOW() as completed_at;

-- Show summary of created tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('email_templates', 'email_notifications', 'smtp_settings')
ORDER BY tablename;

-- Show count of default data
SELECT 
    'email_templates' as table_name,
    COUNT(*) as record_count
FROM email_templates
UNION ALL
SELECT 
    'smtp_settings' as table_name,
    COUNT(*) as record_count
FROM smtp_settings
UNION ALL
SELECT 
    'email_notifications' as table_name,
    COUNT(*) as record_count
FROM email_notifications
ORDER BY table_name;
