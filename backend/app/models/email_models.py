from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class EmailEventType(str, enum.Enum):
    PREPAYMENT_PENDING = "prepayment_pending"
    PREPAYMENT_APPROVED = "prepayment_approved"
    PREPAYMENT_REJECTED = "prepayment_rejected"
    CREDIT_CARD_STATEMENT_CREATED = "credit_card_statement_created"
    REPORT_PENDING = "report_pending"
    REPORT_APPROVED_100 = "report_approved_100"
    REPORT_REIMBURSEMENT_HIGHER_TREASURY = "report_reimbursement_higher_treasury"
    REPORT_REIMBURSEMENT_HIGHER_USER = "report_reimbursement_higher_user"
    REPORT_REIMBURSEMENT_LOWER_USER = "report_reimbursement_lower_user"
    REPORT_REIMBURSEMENT_LOWER_TREASURY = "report_reimbursement_lower_treasury"
    REPORT_REIMBURSEMENT_LOWER_CONFIRMED = "report_reimbursement_lower_confirmed"
    REPORT_REJECTED = "report_rejected"
    REPORT_REJECTED_EXPENSES = "report_rejected_expenses"

class EmailNotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class LanguageCode(str, enum.Enum):
    SPANISH = "es"
    ENGLISH = "en"

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    language = Column(String(5), nullable=False)  # 'es' or 'en'
    subject_template = Column(Text, nullable=False)
    body_template = Column(Text, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255))
    subject = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    language = Column(String(5), nullable=False)
    status = Column(String(50), default=EmailNotificationStatus.PENDING)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SMTPSettings(Base):
    __tablename__ = "smtp_settings"

    id = Column(Integer, primary_key=True, index=True)
    smtp_host = Column(String(255), nullable=False)
    smtp_port = Column(Integer, nullable=False)
    smtp_user = Column(String(255))
    smtp_password = Column(String(255))
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), default="Viaticos System")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
