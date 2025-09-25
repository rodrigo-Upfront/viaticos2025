from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import EmailNotification, EmailEventType, LanguageCode
from app.models.models import User, UserProfile
from app.services.template_service import TemplateService
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.template_service = TemplateService(db)
        self.email_service = EmailService(db)
    
    def get_recipients_for_event(
        self, 
        event_type: EmailEventType, 
        context_data: Dict[str, Any]
    ) -> List[User]:
        """
        Get list of recipients based on event type and context
        """
        recipients = []
        
        if event_type in [
            EmailEventType.PREPAYMENT_PENDING, 
            EmailEventType.REPORT_PENDING
        ]:
            # Send to approvers: managers, accounting, treasury
            approvers = self.db.query(User).filter(
                User.profile.in_([
                    UserProfile.MANAGER,
                    UserProfile.ACCOUNTING, 
                    UserProfile.TREASURY
                ])
            ).all()
            recipients.extend(approvers)
            
        elif event_type in [
            EmailEventType.PREPAYMENT_APPROVED,
            EmailEventType.PREPAYMENT_REJECTED,
            EmailEventType.REPORT_APPROVED_100,
            EmailEventType.REPORT_REIMBURSEMENT_HIGHER_USER,
            EmailEventType.REPORT_REIMBURSEMENT_LOWER_USER,
            EmailEventType.REPORT_REIMBURSEMENT_LOWER_CONFIRMED,
            EmailEventType.REPORT_REJECTED,
            EmailEventType.REPORT_REJECTED_EXPENSES
        ]:
            # Send to request owner
            requesting_user_id = context_data.get('requesting_user_id')
            if requesting_user_id:
                owner = self.db.query(User).filter(User.id == requesting_user_id).first()
                if owner:
                    recipients.append(owner)
            
        elif event_type in [
            EmailEventType.CREDIT_CARD_STATEMENT_CREATED,
            EmailEventType.REPORT_REIMBURSEMENT_HIGHER_TREASURY,
            EmailEventType.REPORT_REIMBURSEMENT_LOWER_TREASURY
        ]:
            # Send to treasury users
            treasury_users = self.db.query(User).filter(
                User.profile == UserProfile.TREASURY
            ).all()
            recipients.extend(treasury_users)
        
        return recipients
    
    def get_user_language(self, user: User) -> LanguageCode:
        """
        Get user's preferred language (default to Spanish)
        """
        # For now, default to Spanish
        # In the future, this could be based on user preferences
        return LanguageCode.SPANISH
    
    def create_notification(
        self,
        event_type: EmailEventType,
        recipient: User,
        context: Dict[str, Any],
        language: LanguageCode = LanguageCode.SPANISH
    ) -> Optional[EmailNotification]:
        """
        Create a notification record for a specific recipient
        """
        # Render email template
        subject, body = self.template_service.render_email_template(
            event_type=event_type.value,
            context=context,
            language=language
        )
        
        if not subject or not body:
            logger.error(f"No template found for event {event_type.value} in language {language.value}")
            return None
        
        # Create notification record
        notification = EmailNotification(
            event_type=event_type.value,
            recipient_email=recipient.email,
            recipient_name=recipient.name,
            subject=subject,
            body=body,
            language=language.value
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    def trigger_prepayment_pending(self, prepayment, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger prepayment pending approval notification
        """
        context = self.template_service.create_template_context(
            prepayment=prepayment,
            user=requesting_user,
            additional_data={"requesting_user_id": requesting_user.id}
        )
        
        recipients = self.get_recipients_for_event(
            EmailEventType.PREPAYMENT_PENDING, 
            context
        )
        
        notifications = []
        for recipient in recipients:
            language = self.get_user_language(recipient)
            notification = self.create_notification(
                EmailEventType.PREPAYMENT_PENDING,
                recipient,
                context,
                language
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    def trigger_prepayment_approved(self, prepayment, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger prepayment approved notification
        """
        context = self.template_service.create_template_context(
            prepayment=prepayment,
            user=requesting_user
        )
        
        language = self.get_user_language(requesting_user)
        notification = self.create_notification(
            EmailEventType.PREPAYMENT_APPROVED,
            requesting_user,
            context,
            language
        )
        
        return [notification] if notification else []
    
    def trigger_prepayment_rejected(self, prepayment, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger prepayment rejected notification
        """
        context = self.template_service.create_template_context(
            prepayment=prepayment,
            user=requesting_user
        )
        
        language = self.get_user_language(requesting_user)
        notification = self.create_notification(
            EmailEventType.PREPAYMENT_REJECTED,
            requesting_user,
            context,
            language
        )
        
        return [notification] if notification else []
    
    def trigger_credit_card_statement_created(self, statement, uploaded_by_user: User) -> List[EmailNotification]:
        """
        Trigger credit card statement created notification
        """
        context = self.template_service.create_template_context(
            statement=statement,
            user=uploaded_by_user
        )
        
        recipients = self.get_recipients_for_event(
            EmailEventType.CREDIT_CARD_STATEMENT_CREATED,
            context
        )
        
        notifications = []
        for recipient in recipients:
            language = self.get_user_language(recipient)
            notification = self.create_notification(
                EmailEventType.CREDIT_CARD_STATEMENT_CREATED,
                recipient,
                context,
                language
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    def trigger_report_pending(self, report, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger expense report pending approval notification
        """
        context = self.template_service.create_template_context(
            report=report,
            user=requesting_user,
            additional_data={"requesting_user_id": requesting_user.id}
        )
        
        recipients = self.get_recipients_for_event(
            EmailEventType.REPORT_PENDING,
            context
        )
        
        notifications = []
        for recipient in recipients:
            language = self.get_user_language(recipient)
            notification = self.create_notification(
                EmailEventType.REPORT_PENDING,
                recipient,
                context,
                language
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    def trigger_report_approved(self, report, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger expense report approved notification
        """
        context = self.template_service.create_template_context(
            report=report,
            user=requesting_user
        )
        
        language = self.get_user_language(requesting_user)
        notification = self.create_notification(
            EmailEventType.REPORT_APPROVED_100,
            requesting_user,
            context,
            language
        )
        
        return [notification] if notification else []
    
    def trigger_report_rejected(self, report, requesting_user: User) -> List[EmailNotification]:
        """
        Trigger expense report rejected notification
        """
        context = self.template_service.create_template_context(
            report=report,
            user=requesting_user
        )
        
        language = self.get_user_language(requesting_user)
        notification = self.create_notification(
            EmailEventType.REPORT_REJECTED,
            requesting_user,
            context,
            language
        )
        
        return [notification] if notification else []
    
    def send_notifications_immediately(self, notifications: List[EmailNotification]) -> Dict[str, int]:
        """
        Send notifications immediately
        """
        results = {"sent": 0, "failed": 0}
        
        for notification in notifications:
            success, error = self.email_service.send_notification(notification.id)
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
                logger.error(f"Failed to send notification {notification.id}: {error}")
        
        return results
    
    def trigger_event(
        self,
        event_type: EmailEventType,
        **kwargs
    ) -> Dict[str, int]:
        """
        Generic event trigger that routes to specific handlers
        """
        notifications = []
        
        try:
            if event_type == EmailEventType.PREPAYMENT_PENDING:
                notifications = self.trigger_prepayment_pending(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.PREPAYMENT_APPROVED:
                notifications = self.trigger_prepayment_approved(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.PREPAYMENT_REJECTED:
                notifications = self.trigger_prepayment_rejected(
                    kwargs['prepayment'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.CREDIT_CARD_STATEMENT_CREATED:
                notifications = self.trigger_credit_card_statement_created(
                    kwargs['statement'], 
                    kwargs['uploaded_by_user']
                )
            elif event_type == EmailEventType.REPORT_PENDING:
                notifications = self.trigger_report_pending(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.REPORT_APPROVED_100:
                notifications = self.trigger_report_approved(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            elif event_type == EmailEventType.REPORT_REJECTED:
                notifications = self.trigger_report_rejected(
                    kwargs['report'], 
                    kwargs['requesting_user']
                )
            # Add more event handlers as needed
            
            # Send notifications immediately
            if notifications:
                return self.send_notifications_immediately(notifications)
            
        except Exception as e:
            logger.error(f"Error triggering event {event_type.value}: {str(e)}")
        
        return {"sent": 0, "failed": 0}
