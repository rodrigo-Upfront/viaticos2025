from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.database.connection import get_db
from app.models.models import User, EmailNotification, EmailNotificationStatus, EmailEventType
from app.schemas.email_schemas import EmailNotificationResponse, EmailNotificationList
from app.services.email_service import EmailService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/email-logs", tags=["Email Logs"])

def require_superuser(current_user: User = Depends(get_current_user)):
    """Dependency to ensure only superusers can access email logs"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to email logs is restricted to superusers"
        )
    return current_user

@router.get("/", response_model=EmailNotificationList)
def get_email_logs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    status_filter: Optional[EmailNotificationStatus] = Query(None, description="Filter by email status"),
    event_type: Optional[EmailEventType] = Query(None, description="Filter by event type"),
    recipient_email: Optional[str] = Query(None, description="Filter by recipient email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get email notification logs with pagination and filtering
    """
    query = db.query(EmailNotification)
    
    # Apply filters
    if status_filter:
        query = query.filter(EmailNotification.status == status_filter.value)
    if event_type:
        query = query.filter(EmailNotification.event_type == event_type.value)
    if recipient_email:
        query = query.filter(EmailNotification.recipient_email.ilike(f"%{recipient_email}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    notifications = query.order_by(desc(EmailNotification.created_at)).offset(
        (page - 1) * per_page
    ).limit(per_page).all()
    
    # Calculate pagination info
    total_pages = (total + per_page - 1) // per_page
    
    return EmailNotificationList(
        items=notifications,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/{notification_id}", response_model=EmailNotificationResponse)
def get_email_log(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get a specific email notification log
    """
    notification = db.query(EmailNotification).filter(
        EmailNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email notification not found"
        )
    
    return notification

@router.post("/{notification_id}/retry")
def retry_email_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Retry sending a failed email notification
    """
    notification = db.query(EmailNotification).filter(
        EmailNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email notification not found"
        )
    
    if notification.status == EmailNotificationStatus.SENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot retry a notification that was already sent successfully"
        )
    
    email_service = EmailService(db)
    success, error_message = email_service.retry_notification(notification_id)
    
    if success:
        return {
            "success": True,
            "message": f"Email notification {notification_id} sent successfully"
        }
    else:
        return {
            "success": False,
            "message": f"Failed to send email notification: {error_message}"
        }

@router.post("/retry-failed")
def retry_all_failed_notifications(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of failed notifications to retry"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Retry all failed email notifications
    """
    failed_notifications = db.query(EmailNotification).filter(
        EmailNotification.status == EmailNotificationStatus.FAILED
    ).limit(limit).all()
    
    if not failed_notifications:
        return {
            "success": True,
            "message": "No failed notifications to retry",
            "retried": 0,
            "sent": 0,
            "failed": 0
        }
    
    email_service = EmailService(db)
    results = {"retried": 0, "sent": 0, "failed": 0}
    
    for notification in failed_notifications:
        results["retried"] += 1
        success, _ = email_service.retry_notification(notification.id)
        if success:
            results["sent"] += 1
        else:
            results["failed"] += 1
    
    return {
        "success": True,
        "message": f"Retried {results['retried']} failed notifications",
        **results
    }

@router.get("/stats/summary")
def get_email_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get email notification statistics
    """
    from sqlalchemy import func
    
    # Get total counts by status
    status_counts = db.query(
        EmailNotification.status,
        func.count(EmailNotification.id).label('count')
    ).group_by(EmailNotification.status).all()
    
    # Get counts by event type
    event_counts = db.query(
        EmailNotification.event_type,
        func.count(EmailNotification.id).label('count')
    ).group_by(EmailNotification.event_type).all()
    
    # Get recent activity (last 24 hours)
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    recent_activity = db.query(
        EmailNotification.status,
        func.count(EmailNotification.id).label('count')
    ).filter(
        EmailNotification.created_at >= yesterday
    ).group_by(EmailNotification.status).all()
    
    # Format results
    status_summary = {item.status: item.count for item in status_counts}
    event_summary = {item.event_type: item.count for item in event_counts}
    recent_summary = {item.status: item.count for item in recent_activity}
    
    return {
        "total_notifications": sum(status_summary.values()),
        "status_breakdown": status_summary,
        "event_breakdown": event_summary,
        "recent_activity_24h": recent_summary,
        "success_rate": (
            status_summary.get("sent", 0) / sum(status_summary.values()) * 100
            if sum(status_summary.values()) > 0 else 0
        )
    }

@router.delete("/{notification_id}")
def delete_email_log(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Delete an email notification log
    """
    notification = db.query(EmailNotification).filter(
        EmailNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Email notification log deleted successfully"}

@router.post("/cleanup")
def cleanup_old_logs(
    days: int = Query(30, ge=1, le=365, description="Delete logs older than this many days"),
    status_filter: Optional[EmailNotificationStatus] = Query(None, description="Only delete logs with this status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Clean up old email notification logs
    """
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(EmailNotification).filter(
        EmailNotification.created_at < cutoff_date
    )
    
    if status_filter:
        query = query.filter(EmailNotification.status == status_filter.value)
    
    # Count before deletion
    count_to_delete = query.count()
    
    # Delete old logs
    query.delete()
    db.commit()
    
    return {
        "success": True,
        "message": f"Deleted {count_to_delete} email logs older than {days} days",
        "deleted_count": count_to_delete
    }
