#!/usr/bin/env python3
"""
Script to populate all default email templates for the notification system
"""

import sys
sys.path.append('/app')

from app.database.connection import SessionLocal
from app.models.models import EmailTemplate
from sqlalchemy import text

def create_templates():
    db = SessionLocal()
    
    try:
        # Check if tables exist
        print("Checking email notification tables...")
        
        # Additional report templates (not in the original migration)
        additional_templates = [
            # Report Events - Spanish
            ('report_pending', 'es', 'Reporte de gastos pendiente de aprobación - {report.reason}', '''
            <h2>Reporte de Gastos Pendiente de Aprobación</h2>
            <p>Estimado/a {user.name},</p>
            <p>Hay un reporte de gastos pendiente de aprobación que requiere su atención:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Solicitante:</strong> {report.requester.name}</li>
              <li><strong>Motivo:</strong> {report.reason}</li>
              <li><strong>Total gastos:</strong> {report.currency} {report.total_expenses}</li>
            </ul>
            <p>Por favor, ingrese al sistema para revisar y procesar este reporte.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">Ver Reporte</a></p>
            <br>
            <p>Saludos,<br>Sistema de Viaticos</p>
            '''),
            
            # Report Events - English
            ('report_pending', 'en', 'Expense report pending approval - {report.reason}', '''
            <h2>Expense Report Pending Approval</h2>
            <p>Dear {user.name},</p>
            <p>There is an expense report pending approval that requires your attention:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Requester:</strong> {report.requester.name}</li>
              <li><strong>Reason:</strong> {report.reason}</li>
              <li><strong>Total expenses:</strong> {report.currency} {report.total_expenses}</li>
            </ul>
            <p>Please log into the system to review and process this report.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">View Report</a></p>
            <br>
            <p>Best regards,<br>Travel Expense System</p>
            '''),
            
            ('report_approved_100', 'es', 'Reporte de gastos aprobado - {report.reason}', '''
            <h2>Reporte de Gastos Aprobado</h2>
            <p>Estimado/a {user.name},</p>
            <p>Su reporte de gastos ha sido aprobado completamente:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Motivo:</strong> {report.reason}</li>
              <li><strong>Total gastos:</strong> {report.currency} {report.total_expenses}</li>
            </ul>
            <p>El reporte será procesado según los procedimientos de reembolso.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">Ver Reporte</a></p>
            <br>
            <p>Saludos,<br>Sistema de Viaticos</p>
            '''),
            
            ('report_approved_100', 'en', 'Expense report approved - {report.reason}', '''
            <h2>Expense Report Approved</h2>
            <p>Dear {user.name},</p>
            <p>Your expense report has been fully approved:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Reason:</strong> {report.reason}</li>
              <li><strong>Total expenses:</strong> {report.currency} {report.total_expenses}</li>
            </ul>
            <p>The report will be processed according to reimbursement procedures.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">View Report</a></p>
            <br>
            <p>Best regards,<br>Travel Expense System</p>
            '''),
            
            ('report_rejected', 'es', 'Reporte de gastos rechazado - {report.reason}', '''
            <h2>Reporte de Gastos Rechazado</h2>
            <p>Estimado/a {user.name},</p>
            <p>Su reporte de gastos ha sido rechazado:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Motivo:</strong> {report.reason}</li>
              <li><strong>Total gastos:</strong> {report.currency} {report.total_expenses}</li>
              <li><strong>Motivo del rechazo:</strong> {report.rejection_reason}</li>
            </ul>
            <p>Por favor, revise los comentarios y proceda según corresponda.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">Ver Reporte</a></p>
            <br>
            <p>Saludos,<br>Sistema de Viaticos</p>
            '''),
            
            ('report_rejected', 'en', 'Expense report rejected - {report.reason}', '''
            <h2>Expense Report Rejected</h2>
            <p>Dear {user.name},</p>
            <p>Your expense report has been rejected:</p>
            <ul>
              <li><strong>ID:</strong> {report.id}</li>
              <li><strong>Reason:</strong> {report.reason}</li>
              <li><strong>Total expenses:</strong> {report.currency} {report.total_expenses}</li>
              <li><strong>Rejection reason:</strong> {report.rejection_reason}</li>
            </ul>
            <p>Please review the comments and proceed accordingly.</p>
            <p><a href="{system.app_url}/reports/view/{report.id}">View Report</a></p>
            <br>
            <p>Best regards,<br>Travel Expense System</p>
            '''),
        ]
        
        # Insert additional templates
        for event_type, language, subject, body in additional_templates:
            # Check if template already exists
            existing = db.query(EmailTemplate).filter(
                EmailTemplate.event_type == event_type,
                EmailTemplate.language == language
            ).first()
            
            if not existing:
                template = EmailTemplate(
                    event_type=event_type,
                    language=language,
                    subject_template=subject,
                    body_template=body.strip(),
                    enabled=True
                )
                db.add(template)
                print(f"✅ Added template: {event_type} ({language})")
            else:
                print(f"⚠️  Template already exists: {event_type} ({language})")
        
        db.commit()
        print("✅ All email templates populated successfully!")
        
        # Show summary
        total_templates = db.query(EmailTemplate).count()
        print(f"📧 Total email templates in database: {total_templates}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_templates()
