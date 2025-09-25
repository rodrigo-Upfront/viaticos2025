from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import EmailEventType, EmailNotificationStatus, LanguageCode

# Email Template Schemas
class EmailTemplateBase(BaseModel):
    event_type: EmailEventType
    language: LanguageCode
    subject_template: str
    body_template: str
    enabled: bool = True

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    subject_template: Optional[str] = None
    body_template: Optional[str] = None
    enabled: Optional[bool] = None

class EmailTemplateResponse(EmailTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Email Notification Schemas
class EmailNotificationBase(BaseModel):
    event_type: EmailEventType
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body: str
    language: LanguageCode

class EmailNotificationCreate(EmailNotificationBase):
    pass

class EmailNotificationResponse(EmailNotificationBase):
    id: int
    status: EmailNotificationStatus
    error_message: Optional[str] = None
    retry_count: int
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmailNotificationList(BaseModel):
    items: List[EmailNotificationResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# SMTP Settings Schemas
class SMTPSettingsBase(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: bool = True
    use_ssl: bool = False
    from_email: EmailStr
    from_name: str = "Viaticos System"
    is_active: bool = True

class SMTPSettingsCreate(SMTPSettingsBase):
    pass

class SMTPSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    is_active: Optional[bool] = None

class SMTPSettingsResponse(SMTPSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Test Email Schema
class TestEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str = "Test Email from Viaticos System"
    body: str = "<h2>Test Email</h2><p>This is a test email to verify SMTP configuration.</p>"

# Template Variable Schema (for frontend editor)
class TemplateVariable(BaseModel):
    key: str
    description: str
    category: str

class TemplateVariableGroup(BaseModel):
    category: str
    variables: List[TemplateVariable]

# Email Event Context Schema
class EmailEventContext(BaseModel):
    event_type: EmailEventType
    recipients: List[str]
    data: dict  # Contains the actual data for template variables
    language_preference: Optional[LanguageCode] = None
