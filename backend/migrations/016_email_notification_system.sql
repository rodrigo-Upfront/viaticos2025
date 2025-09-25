-- Email Notification System Migration
-- Creates tables for email templates, notifications log, and SMTP settings

-- Email Templates Table (Bilingual support)
CREATE TABLE email_templates (
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

-- Email Notifications Log/Queue Table
CREATE TABLE email_notifications (
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

-- SMTP Configuration Table
CREATE TABLE smtp_settings (
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

-- Indexes for better performance
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_event_type ON email_notifications(event_type);
CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX idx_email_templates_event_language ON email_templates(event_type, language);

-- Insert default SMTP settings (placeholder)
INSERT INTO smtp_settings (smtp_host, smtp_port, smtp_user, from_email, from_name) 
VALUES ('localhost', 587, '', 'noreply@viaticos.com', 'Sistema de Viaticos');

-- Insert default email templates for each event type in both languages
-- Prepayment Events
INSERT INTO email_templates (event_type, language, subject_template, body_template) VALUES
('prepayment_pending', 'es', 'Anticipo pendiente de aprobación - {prepayment.reason}', 
 '<h2>Anticipo Pendiente de Aprobación</h2>
 <p>Estimado/a {user.name},</p>
 <p>Hay un anticipo pendiente de aprobación que requiere su atención:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Solicitante:</strong> {prepayment.requester.name}</li>
   <li><strong>Motivo:</strong> {prepayment.reason}</li>
   <li><strong>Monto:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Destino:</strong> {prepayment.destination}</li>
 </ul>
 <p>Por favor, ingrese al sistema para revisar y procesar esta solicitud.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">Ver Anticipo</a></p>
 <br>
 <p>Saludos,<br>Sistema de Viaticos</p>'),

('prepayment_pending', 'en', 'Prepayment pending approval - {prepayment.reason}', 
 '<h2>Prepayment Pending Approval</h2>
 <p>Dear {user.name},</p>
 <p>There is a prepayment pending approval that requires your attention:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Requester:</strong> {prepayment.requester.name}</li>
   <li><strong>Reason:</strong> {prepayment.reason}</li>
   <li><strong>Amount:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Destination:</strong> {prepayment.destination}</li>
 </ul>
 <p>Please log into the system to review and process this request.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">View Prepayment</a></p>
 <br>
 <p>Best regards,<br>Travel Expense System</p>'),

('prepayment_approved', 'es', 'Anticipo aprobado - {prepayment.reason}', 
 '<h2>Anticipo Aprobado</h2>
 <p>Estimado/a {user.name},</p>
 <p>Su anticipo ha sido aprobado:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Motivo:</strong> {prepayment.reason}</li>
   <li><strong>Monto:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Destino:</strong> {prepayment.destination}</li>
 </ul>
 <p>El anticipo será procesado según los procedimientos de la empresa.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">Ver Anticipo</a></p>
 <br>
 <p>Saludos,<br>Sistema de Viaticos</p>'),

('prepayment_approved', 'en', 'Prepayment approved - {prepayment.reason}', 
 '<h2>Prepayment Approved</h2>
 <p>Dear {user.name},</p>
 <p>Your prepayment has been approved:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Reason:</strong> {prepayment.reason}</li>
   <li><strong>Amount:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Destination:</strong> {prepayment.destination}</li>
 </ul>
 <p>The prepayment will be processed according to company procedures.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">View Prepayment</a></p>
 <br>
 <p>Best regards,<br>Travel Expense System</p>'),

('prepayment_rejected', 'es', 'Anticipo rechazado - {prepayment.reason}', 
 '<h2>Anticipo Rechazado</h2>
 <p>Estimado/a {user.name},</p>
 <p>Su anticipo ha sido rechazado:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Motivo:</strong> {prepayment.reason}</li>
   <li><strong>Monto:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Motivo del rechazo:</strong> {prepayment.rejection_reason}</li>
 </ul>
 <p>Por favor, revise los comentarios y proceda según corresponda.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">Ver Anticipo</a></p>
 <br>
 <p>Saludos,<br>Sistema de Viaticos</p>'),

('prepayment_rejected', 'en', 'Prepayment rejected - {prepayment.reason}', 
 '<h2>Prepayment Rejected</h2>
 <p>Dear {user.name},</p>
 <p>Your prepayment has been rejected:</p>
 <ul>
   <li><strong>ID:</strong> {prepayment.id}</li>
   <li><strong>Reason:</strong> {prepayment.reason}</li>
   <li><strong>Amount:</strong> {prepayment.currency} {prepayment.amount}</li>
   <li><strong>Rejection reason:</strong> {prepayment.rejection_reason}</li>
 </ul>
 <p>Please review the comments and proceed accordingly.</p>
 <p><a href="{system.app_url}/prepayments/{prepayment.id}">View Prepayment</a></p>
 <br>
 <p>Best regards,<br>Travel Expense System</p>'),

-- Credit Card Statement Creation
('credit_card_statement_created', 'es', 'Nuevo estado de cuenta de tarjeta de crédito subido', 
 '<h2>Estado de Cuenta de Tarjeta de Crédito</h2>
 <p>Estimado equipo de Tesorería,</p>
 <p>Se ha subido un nuevo estado de cuenta de tarjeta de crédito:</p>
 <ul>
   <li><strong>Archivo:</strong> {statement.filename}</li>
   <li><strong>Período:</strong> {statement.period}</li>
   <li><strong>Total registros:</strong> {statement.record_count}</li>
   <li><strong>Subido por:</strong> {statement.uploaded_by}</li>
 </ul>
 <p>Por favor, procese el estado de cuenta en el sistema.</p>
 <p><a href="{system.app_url}/credit-card-statements/{statement.id}">Ver Estado de Cuenta</a></p>
 <br>
 <p>Saludos,<br>Sistema de Viaticos</p>'),

('credit_card_statement_created', 'en', 'New credit card statement uploaded', 
 '<h2>Credit Card Statement</h2>
 <p>Dear Treasury team,</p>
 <p>A new credit card statement has been uploaded:</p>
 <ul>
   <li><strong>File:</strong> {statement.filename}</li>
   <li><strong>Period:</strong> {statement.period}</li>
   <li><strong>Total records:</strong> {statement.record_count}</li>
   <li><strong>Uploaded by:</strong> {statement.uploaded_by}</li>
 </ul>
 <p>Please process the statement in the system.</p>
 <p><a href="{system.app_url}/credit-card-statements/{statement.id}">View Statement</a></p>
 <br>
 <p>Best regards,<br>Travel Expense System</p>');

-- Report Events (adding remaining templates in next batch to keep migration manageable)
-- This migration creates the foundation, additional templates will be added programmatically
