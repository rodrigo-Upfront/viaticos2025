"""
Asynchronous Email Notification Service

This service decouples email sending from business logic (approvals, etc.)
Emails are queued and processed in background, ensuring business operations
never fail due to email delivery issues.
"""

import asyncio
import threading
import logging
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
from app.models.models import EmailNotification, EmailEventType, EmailNotificationStatus
from app.services.notification_service import NotificationService
from app.services.email_service import EmailService
from app.core.config import settings

logger = logging.getLogger(__name__)

class AsyncNotificationService:
    """
    Asynchronous email notification service that processes emails in background
    """
    
    def __init__(self):
        self.is_running = False
        self.worker_thread = None
        self.stop_event = threading.Event()
        
        # Create separate database session for background worker
        self.engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def start_worker(self):
        """Start the background email processing worker"""
        if self.is_running:
            logger.warning("Email worker is already running")
            return
            
        self.is_running = True
        self.stop_event.clear()
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        logger.info("🚀 Async email worker started")
    
    def stop_worker(self):
        """Stop the background email processing worker"""
        if not self.is_running:
            return
            
        self.stop_event.set()
        self.is_running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        logger.info("🛑 Async email worker stopped")
    
    def _worker_loop(self):
        """Main worker loop that processes pending email notifications"""
        logger.info("📧 Email worker loop started")
        
        while not self.stop_event.is_set():
            try:
                self._process_pending_emails()
                
                # Wait 30 seconds before next check, or until stop event
                self.stop_event.wait(30)
                
            except Exception as e:
                logger.error(f"Error in email worker loop: {str(e)}")
                # Wait a bit longer on error to avoid spam
                self.stop_event.wait(60)
    
    def _process_pending_emails(self):
        """Process all pending email notifications"""
        db = self.SessionLocal()
        try:
            # Get pending notifications (not sent, not failed too many times)
            pending_notifications = db.query(EmailNotification).filter(
                EmailNotification.status.in_([
                    EmailNotificationStatus.PENDING,
                    EmailNotificationStatus.FAILED
                ]),
                EmailNotification.retry_count < 3,  # Max 3 retries
                # Don't retry failed emails too quickly (wait at least 5 minutes)
                (EmailNotification.updated_at < datetime.utcnow() - timedelta(minutes=5))
            ).limit(10).all()  # Process max 10 at a time
            
            if not pending_notifications:
                return
            
            logger.info(f"📬 Processing {len(pending_notifications)} pending email notifications")
            
            email_service = EmailService(db)
            
            for notification in pending_notifications:
                try:
                    success, error_message = email_service.send_notification(notification.id)
                    
                    if success:
                        logger.info(f"✅ Email sent successfully: {notification.subject} to {notification.recipient_email}")
                    else:
                        logger.warning(f"❌ Email failed: {notification.subject} to {notification.recipient_email} - {error_message}")
                        
                except Exception as e:
                    logger.error(f"💥 Error processing notification {notification.id}: {str(e)}")
                    
                    # Mark as failed
                    notification.status = EmailNotificationStatus.FAILED
                    notification.error_message = str(e)
                    notification.retry_count += 1
                    notification.updated_at = datetime.utcnow()
                    db.commit()
            
        except Exception as e:
            logger.error(f"Error processing pending emails: {str(e)}")
        finally:
            db.close()
    
    def queue_event(
        self, 
        db: Session,
        event_type: EmailEventType,
        **kwargs
    ) -> bool:
        """
        Queue an email event for background processing
        
        This method NEVER fails - it just queues the email and returns immediately.
        The actual email sending happens asynchronously in the background.
        
        Returns:
            bool: True if successfully queued, False if error (but doesn't raise)
        """
        try:
            # Use the existing NotificationService to create notifications
            notification_service = NotificationService(db)
            
            # Create notifications (but don't send them immediately)
            notifications = []
            
            if event_type == EmailEventType.PREPAYMENT_PENDING:
                notifications = notification_service.trigger_prepayment_pending(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.PREPAYMENT_APPROVED:
                notifications = notification_service.trigger_prepayment_approved(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.PREPAYMENT_REJECTED:
                notifications = notification_service.trigger_prepayment_rejected(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.REPORT_PENDING:
                notifications = notification_service.trigger_report_pending(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.REPORT_APPROVED_100:
                notifications = notification_service.trigger_report_approved(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.REPORT_REJECTED:
                notifications = notification_service.trigger_report_rejected(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.CREDIT_CARD_STATEMENT_CREATED:
                notifications = notification_service.trigger_credit_card_statement_created(
                    kwargs['statement'], 
                    kwargs['uploaded_by_user']
                )
            
            # All notifications are now queued in database with PENDING status
            # The background worker will pick them up and send them
            
            if notifications:
                logger.info(f"📥 Queued {len(notifications)} email notifications for {event_type.value}")
            
            return True
            
        except Exception as e:
            # Log error but don't fail the calling operation
            logger.error(f"Failed to queue email event {event_type.value}: {str(e)}")
            return False


# Global instance
async_notification_service = AsyncNotificationService()

def start_async_email_worker():
    """Start the global async email worker"""
    async_notification_service.start_worker()

def stop_async_email_worker():
    """Stop the global async email worker"""
    async_notification_service.stop_worker()

def queue_email_event(db: Session, event_type: EmailEventType, **kwargs) -> bool:
    """
    Queue an email event for background processing
    
    This is the main function that should be called from approval endpoints.
    It NEVER fails the calling operation - just logs errors and continues.
    """
    return async_notification_service.queue_event(db, event_type, **kwargs)
