import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import SMTPSettings, EmailNotification, EmailNotificationStatus
from app.schemas.email_schemas import TestEmailRequest

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self._smtp_settings = None
    
    def get_smtp_settings(self) -> Optional[SMTPSettings]:
        """Get active SMTP settings from database"""
        if not self._smtp_settings:
            self._smtp_settings = self.db.query(SMTPSettings).filter(
                SMTPSettings.is_active == True
            ).first()
        return self._smtp_settings
    
    def refresh_smtp_settings(self):
        """Refresh cached SMTP settings"""
        self._smtp_settings = None
        return self.get_smtp_settings()
    
    def send_email(
        self, 
        recipient_email: str, 
        subject: str, 
        body: str,
        recipient_name: Optional[str] = None,
        is_html: bool = True
    ) -> tuple[bool, Optional[str]]:
        """
        Send an email using configured SMTP settings
        Returns: (success: bool, error_message: Optional[str])
        """
        smtp_settings = self.get_smtp_settings()
        if not smtp_settings:
            return False, "No SMTP settings configured"
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = formataddr((smtp_settings.from_name, smtp_settings.from_email))
            
            # Format recipient
            if recipient_name:
                message["To"] = formataddr((recipient_name, recipient_email))
            else:
                message["To"] = recipient_email
            
            # Add body
            if is_html:
                html_part = MIMEText(body, "html", "utf-8")
                message.attach(html_part)
            else:
                text_part = MIMEText(body, "plain", "utf-8")
                message.attach(text_part)
            
            # Create SMTP connection
            if smtp_settings.use_ssl:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(smtp_settings.smtp_host, smtp_settings.smtp_port, context=context)
            else:
                server = smtplib.SMTP(smtp_settings.smtp_host, smtp_settings.smtp_port)
                if smtp_settings.use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
            
            # Login if credentials provided
            if smtp_settings.smtp_user and smtp_settings.smtp_password:
                server.login(smtp_settings.smtp_user, smtp_settings.smtp_password)
            
            # Send email
            server.send_message(message)
            server.quit()
            
            logger.info(f"Email sent successfully to {recipient_email}")
            return True, None
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP Authentication failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except smtplib.SMTPRecipientsRefused as e:
            error_msg = f"Recipient refused: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except smtplib.SMTPServerDisconnected as e:
            error_msg = f"SMTP server disconnected: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def send_notification(self, notification_id: int) -> tuple[bool, Optional[str]]:
        """
        Send a notification from the email_notifications table
        Updates the notification status in database
        """
        notification = self.db.query(EmailNotification).filter(
            EmailNotification.id == notification_id
        ).first()
        
        if not notification:
            return False, "Notification not found"
        
        if notification.status == EmailNotificationStatus.SENT:
            return False, "Notification already sent"
        
        # Send the email
        success, error_message = self.send_email(
            recipient_email=notification.recipient_email,
            subject=notification.subject,
            body=notification.body,
            recipient_name=notification.recipient_name,
            is_html=True
        )
        
        # Update notification status
        if success:
            notification.status = EmailNotificationStatus.SENT
            notification.sent_at = datetime.utcnow()
            notification.error_message = None
        else:
            notification.status = EmailNotificationStatus.FAILED
            notification.error_message = error_message
            notification.retry_count += 1
        
        notification.updated_at = datetime.utcnow()
        self.db.commit()
        
        return success, error_message
    
    def retry_notification(self, notification_id: int) -> tuple[bool, Optional[str]]:
        """
        Retry sending a failed notification
        """
        notification = self.db.query(EmailNotification).filter(
            EmailNotification.id == notification_id
        ).first()
        
        if not notification:
            return False, "Notification not found"
        
        if notification.status == EmailNotificationStatus.SENT:
            return False, "Notification already sent"
        
        # Reset status to pending and try again
        notification.status = EmailNotificationStatus.PENDING
        self.db.commit()
        
        return self.send_notification(notification_id)
    
    def send_test_email(self, test_request: TestEmailRequest) -> tuple[bool, Optional[str]]:
        """
        Send a test email to verify SMTP configuration
        """
        return self.send_email(
            recipient_email=test_request.recipient_email,
            subject=test_request.subject,
            body=test_request.body,
            is_html=True
        )
    
    def get_pending_notifications(self, limit: int = 100) -> List[EmailNotification]:
        """
        Get pending email notifications for processing
        """
        return self.db.query(EmailNotification).filter(
            EmailNotification.status == EmailNotificationStatus.PENDING
        ).limit(limit).all()
    
    def process_pending_notifications(self, limit: int = 100) -> Dict[str, int]:
        """
        Process pending email notifications
        Returns count of processed emails by status
        """
        pending_notifications = self.get_pending_notifications(limit)
        
        results = {
            "processed": 0,
            "sent": 0,
            "failed": 0
        }
        
        for notification in pending_notifications:
            success, _ = self.send_notification(notification.id)
            results["processed"] += 1
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results
