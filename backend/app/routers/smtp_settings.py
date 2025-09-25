from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database.connection import get_db
from app.models.models import User, SMTPSettings
from app.schemas.email_schemas import (
    SMTPSettingsResponse,
    SMTPSettingsCreate,
    SMTPSettingsUpdate,
    TestEmailRequest
)
from app.services.email_service import EmailService
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/smtp-settings", tags=["SMTP Settings"])

def require_superuser(current_user: User = Depends(get_current_user)):
    """Dependency to ensure only superusers can access SMTP settings"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to SMTP settings is restricted to superusers"
        )
    return current_user

@router.get("/", response_model=Optional[SMTPSettingsResponse])
def get_smtp_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Get current SMTP settings
    """
    settings = db.query(SMTPSettings).filter(SMTPSettings.is_active == True).first()
    return settings

@router.post("/", response_model=SMTPSettingsResponse)
def create_smtp_settings(
    settings_data: SMTPSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Create new SMTP settings (deactivates existing ones)
    """
    # Deactivate existing settings
    existing_settings = db.query(SMTPSettings).all()
    for setting in existing_settings:
        setting.is_active = False
    
    # Create new settings
    new_settings = SMTPSettings(
        smtp_host=settings_data.smtp_host,
        smtp_port=settings_data.smtp_port,
        smtp_user=settings_data.smtp_user,
        smtp_password=settings_data.smtp_password,
        use_tls=settings_data.use_tls,
        use_ssl=settings_data.use_ssl,
        from_email=settings_data.from_email,
        from_name=settings_data.from_name,
        is_active=True
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings

@router.put("/{settings_id}", response_model=SMTPSettingsResponse)
def update_smtp_settings(
    settings_id: int,
    settings_update: SMTPSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Update existing SMTP settings
    """
    settings = db.query(SMTPSettings).filter(SMTPSettings.id == settings_id).first()
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMTP settings not found"
        )
    
    # Update fields if provided
    if settings_update.smtp_host is not None:
        settings.smtp_host = settings_update.smtp_host
    if settings_update.smtp_port is not None:
        settings.smtp_port = settings_update.smtp_port
    if settings_update.smtp_user is not None:
        settings.smtp_user = settings_update.smtp_user
    if settings_update.smtp_password is not None:
        settings.smtp_password = settings_update.smtp_password
    if settings_update.use_tls is not None:
        settings.use_tls = settings_update.use_tls
    if settings_update.use_ssl is not None:
        settings.use_ssl = settings_update.use_ssl
    if settings_update.from_email is not None:
        settings.from_email = settings_update.from_email
    if settings_update.from_name is not None:
        settings.from_name = settings_update.from_name
    if settings_update.is_active is not None:
        # If activating this setting, deactivate others
        if settings_update.is_active:
            other_settings = db.query(SMTPSettings).filter(SMTPSettings.id != settings_id).all()
            for other in other_settings:
                other.is_active = False
        settings.is_active = settings_update.is_active
    
    db.commit()
    db.refresh(settings)
    
    # Refresh email service cache
    email_service = EmailService(db)
    email_service.refresh_smtp_settings()
    
    return settings

@router.post("/test-email")
def send_test_email(
    test_request: TestEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Send a test email to verify SMTP configuration
    """
    email_service = EmailService(db)
    
    # Check if SMTP settings exist
    smtp_settings = email_service.get_smtp_settings()
    if not smtp_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No SMTP settings configured. Please configure SMTP settings first."
        )
    
    # Send test email
    success, error_message = email_service.send_test_email(test_request)
    
    if success:
        return {
            "success": True,
            "message": f"Test email sent successfully to {test_request.recipient_email}"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send test email: {error_message}"
        )

@router.delete("/{settings_id}")
def delete_smtp_settings(
    settings_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Delete SMTP settings
    """
    settings = db.query(SMTPSettings).filter(SMTPSettings.id == settings_id).first()
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SMTP settings not found"
        )
    
    db.delete(settings)
    db.commit()
    
    return {"message": "SMTP settings deleted successfully"}

@router.get("/connection-test")
def test_smtp_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser)
):
    """
    Test SMTP connection without sending an email
    """
    email_service = EmailService(db)
    smtp_settings = email_service.get_smtp_settings()
    
    if not smtp_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No SMTP settings configured"
        )
    
    try:
        import smtplib
        import ssl
        
        # Test connection based on settings
        if smtp_settings.use_ssl:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(smtp_settings.smtp_host, smtp_settings.smtp_port, context=context)
        else:
            server = smtplib.SMTP(smtp_settings.smtp_host, smtp_settings.smtp_port)
            if smtp_settings.use_tls:
                context = ssl.create_default_context()
                server.starttls(context=context)
        
        # Test authentication if credentials provided
        if smtp_settings.smtp_user and smtp_settings.smtp_password:
            server.login(smtp_settings.smtp_user, smtp_settings.smtp_password)
        
        server.quit()
        
        return {
            "success": True,
            "message": "SMTP connection successful"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SMTP connection failed: {str(e)}"
        )
