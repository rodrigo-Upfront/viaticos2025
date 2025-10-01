"""
Database Models for Viaticos 2025
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Date, 
    ForeignKey, Enum as SQLEnum, UniqueConstraint, Numeric, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database.connection import Base


# Enums
class UserProfile(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    ACCOUNTING = "ACCOUNTING"
    TREASURY = "TREASURY"


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUPERVISOR_PENDING = "SUPERVISOR_PENDING"
    ACCOUNTING_PENDING = "ACCOUNTING_PENDING"
    TREASURY_PENDING = "TREASURY_PENDING"
    APPROVED_FOR_REIMBURSEMENT = "APPROVED_FOR_REIMBURSEMENT"
    FUNDS_RETURN_PENDING = "FUNDS_RETURN_PENDING"
    REVIEW_RETURN = "REVIEW_RETURN"
    APPROVED = "APPROVED"  # Keep for backward compatibility
    APPROVED_EXPENSES = "APPROVED_EXPENSES"
    APPROVED_REPAID = "APPROVED_REPAID"
    APPROVED_RETURNED_FUNDS = "APPROVED_RETURNED_FUNDS"
    REJECTED = "REJECTED"


class DocumentType(str, enum.Enum):
    BOLETA = "BOLETA"
    FACTURA = "FACTURA"


class TaxableOption(str, enum.Enum):
    SI = "SI"
    NO = "NO"


class ExpenseStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROCESS = "IN_PROCESS"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EntityType(str, enum.Enum):
    PREPAYMENT = "PREPAYMENT"
    TRAVEL_EXPENSE_REPORT = "TRAVEL_EXPENSE_REPORT"


class ApprovalAction(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETURNED = "RETURNED"


class BudgetStatus(str, enum.Enum):
    UNDER_BUDGET = "UNDER_BUDGET"
    OVER_BUDGET = "OVER_BUDGET"


# New enum for report type
class ReportType(str, enum.Enum):
    PREPAYMENT = "PREPAYMENT"
    REIMBURSEMENT = "REIMBURSEMENT"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)  # Hashed password
    sap_code = Column(String(50), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    cost_center = Column(String(100), nullable=False)
    credit_card_number = Column(String(20), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    profile = Column(SQLEnum(UserProfile), nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_approver = Column(Boolean, default=False, nullable=False)
    force_password_change = Column(Boolean, default=True, nullable=False)
    
    # MFA (Multi-Factor Authentication) fields
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(255), nullable=True)  # TOTP secret (encrypted)
    backup_codes = Column(JSON, nullable=True)  # Array of backup codes (hashed)
    mfa_last_used = Column(DateTime(timezone=True), nullable=True)  # Prevent replay attacks
    mfa_required_by_admin = Column(Boolean, default=False, nullable=False)  # Admin-forced MFA requirement
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    country = relationship("Country", back_populates="users")
    location = relationship("Location")
    supervisor = relationship("User", remote_side=[id], back_populates="subordinates")
    subordinates = relationship("User", back_populates="supervisor")
    prepayments = relationship("Prepayment", back_populates="requesting_user")
    expense_reports = relationship("TravelExpenseReport", back_populates="requesting_user")
    approvals = relationship("Approval", back_populates="approver_user")
    approval_history = relationship("ApprovalHistory", back_populates="user")


class Currency(Base):
    __tablename__ = "currencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "Peruvian Sol", "US Dollar"
    code = Column(String(10), unique=True, nullable=False)   # e.g., "PEN", "USD"
    symbol = Column(String(10), nullable=True)               # e.g., "S/", "$"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    prepayments = relationship("Prepayment", back_populates="currency")
    expenses = relationship("Expense", back_populates="currency")


class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="country")
    prepayments = relationship("Prepayment", back_populates="destination_country")
    expenses = relationship("Expense", back_populates="country")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Removed unique constraint since categories are now location-specific
    account = Column(String(50), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)  # Added location foreign key
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    location = relationship("Location", back_populates="categories")
    expenses = relationship("Expense", back_populates="category")
    country_alerts = relationship("CategoryCountryAlert", back_populates="category")
    
    # Unique constraint - one category name per location
    __table_args__ = (UniqueConstraint('name', 'location_id', name='_category_location_uc'),)


class CategoryCountryAlert(Base):
    __tablename__ = "category_country_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    alert_amount = Column(Numeric(12, 2), nullable=False)
    # Optional custom message to be shown when alert is triggered
    alert_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("ExpenseCategory", back_populates="country_alerts")
    country = relationship("Country")
    currency = relationship("Currency")
    
    # Unique constraint
    __table_args__ = (UniqueConstraint('category_id', 'country_id', 'currency_id', name='_category_country_currency_alert_uc'),)


class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sap_code = Column(String(50), nullable=False, unique=True)
    cost_center = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    location_currencies = relationship("LocationCurrency", back_populates="location", cascade="all, delete-orphan")
    categories = relationship("ExpenseCategory", back_populates="location", cascade="all, delete-orphan")


class LocationCurrency(Base):
    __tablename__ = "location_currencies"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    account = Column(String(255), nullable=False)  # Account field for this location-currency combination
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    location = relationship("Location", back_populates="location_currencies")
    currency = relationship("Currency")
    
    # Unique constraint - one account per location-currency pair
    __table_args__ = (UniqueConstraint('location_id', 'currency_id', name='_location_currency_uc'),)


class FacturaSupplier(Base):
    __tablename__ = "factura_suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    tax_name = Column(String(200), nullable=False)  # Supplier Tax Name / RUC
    sap_code = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="factura_supplier")


class Tax(Base):
    __tablename__ = "taxes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # Tax Code / Código
    regime = Column(String(200), nullable=False)  # Tax Regime / Régimen
    rate = Column(Numeric(5, 2), nullable=True)  # Tax rate as percentage (e.g., 18.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="tax")


class Prepayment(Base):
    __tablename__ = "prepayments"
    
    id = Column(Integer, primary_key=True, index=True)
    reason = Column(Text, nullable=False)
    destination_country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    justification_files = Column(JSON, nullable=True)  # Array of file objects: [{"filename": "...", "original_name": "...", "file_path": "..."}]
    comment = Column(Text, nullable=True)
    # Reason provided when a prepayment was rejected in the approval flow
    rejection_reason = Column(Text, nullable=True)
    # Treasury approval fields
    deposit_number = Column(String(20), nullable=True)
    sap_prepayment_file = Column(String(500), nullable=True)  # File path to SAP file
    sap_record_number = Column(String(20), nullable=True)
    # Reserved report ID (populated when SAP file is generated, used when creating the report)
    report_id = Column(Integer, nullable=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    requesting_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    destination_country = relationship("Country", back_populates="prepayments")
    currency = relationship("Currency", back_populates="prepayments")
    requesting_user = relationship("User", back_populates="prepayments")
    travel_expense_report = relationship("TravelExpenseReport", back_populates="prepayment", uselist=False)



class TravelExpenseReport(Base):
    __tablename__ = "travel_expense_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    prepayment_id = Column(Integer, ForeignKey("prepayments.id"), unique=True, nullable=True)
    report_type = Column(SQLEnum(ReportType), nullable=False, default=ReportType.PREPAYMENT)
    # Manual reimbursement fields (used when report_type = REIMBURSEMENT)
    reason = Column(Text, nullable=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=True)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False)
    requesting_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Fund return fields (for FUNDS_RETURN_PENDING workflow)
    return_document_number = Column(String(100), nullable=True)
    return_document_files = Column(JSON, nullable=True)  # Array of file paths
    
    # Accounting approval SAP fields
    sap_expenses_file = Column(String(500), nullable=True)  # Path to SAP expenses report file
    sap_compensation_file = Column(String(500), nullable=True)  # Path to SAP compensation report file
    sap_compensation_number = Column(String(50), nullable=True)  # SAP compensation number
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    prepayment = relationship("Prepayment", back_populates="travel_expense_report")
    requesting_user = relationship("User", back_populates="expense_reports")
    expenses = relationship("Expense", back_populates="travel_expense_report")
    country = relationship("Country")
    currency = relationship("Currency")



# Credit Card Statement Import Models
class CreditCardStatement(Base):
    __tablename__ = "credit_card_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="UPLOADED", nullable=False)  # UPLOADED, PROCESSED, COMPLETED
    total_records = Column(Integer, nullable=True)
    processed_records = Column(Integer, nullable=True)
    validation_errors = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    uploaded_by = relationship("User")
    transactions = relationship("CreditCardTransaction", back_populates="statement")
    consolidated_expenses = relationship("CreditCardConsolidatedExpense", back_populates="statement")


class CreditCardTransaction(Base):
    __tablename__ = "credit_card_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("credit_card_statements.id"), nullable=False)
    credit_card_number = Column(String(50), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # CONSUMO, CARGO ACUM.CPRA.EXTERIOR, etc.
    currency_code = Column(String(10), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_date = Column(Date, nullable=False)
    merchant = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    raw_data = Column(JSON, nullable=True)  # Store all CSV columns
    matched_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    consolidated_expense_id = Column(Integer, ForeignKey("credit_card_consolidated_expenses.id"), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, MATCHED, CONSOLIDATED, PROCESSED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    statement = relationship("CreditCardStatement", back_populates="transactions")
    matched_user = relationship("User")
    consolidated_expense = relationship("CreditCardConsolidatedExpense", back_populates="source_transactions")


class CreditCardConsolidatedExpense(Base):
    __tablename__ = "credit_card_consolidated_expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("credit_card_statements.id"), nullable=False)
    credit_card_number = Column(String(50), nullable=False)
    currency_code = Column(String(10), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    expense_date = Column(Date, nullable=False)  # max date from group
    expense_description = Column(String(500), nullable=False)
    supplier_name = Column(String(200), nullable=False)
    transaction_count = Column(Integer, nullable=False)
    source_transaction_ids = Column(JSON, nullable=False)  # Array of transaction IDs
    matched_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    associated_prepayment_id = Column(Integer, ForeignKey("prepayments.id"), nullable=True)
    created_expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, PREPAYMENT_CREATED, EXPENSE_CREATED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    statement = relationship("CreditCardStatement", back_populates="consolidated_expenses")
    matched_user = relationship("User")
    associated_prepayment = relationship("Prepayment")
    source_transactions = relationship("CreditCardTransaction", back_populates="consolidated_expense")


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)  # Allow NULL for credit card imports
    travel_expense_report_id = Column(Integer, ForeignKey("travel_expense_reports.id"), nullable=True)
    purpose = Column(String(500), nullable=True)  # Allow NULL for credit card imports
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    boleta_supplier = Column(String(200), nullable=True)
    factura_supplier_id = Column(Integer, ForeignKey("factura_suppliers.id"), nullable=True)
    expense_date = Column(Date, nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    document_number = Column(String(100), nullable=True)  # Allow NULL for credit card imports
    taxable = Column(SQLEnum(TaxableOption), default=TaxableOption.NO, nullable=True)
    tax_id = Column(Integer, ForeignKey("taxes.id"), nullable=True)  # Tax for taxable invoices
    sap_invoice_number = Column(String(50), nullable=True)  # SAP invoice number for FACTURA expenses
    document_file = Column(String(500), nullable=True)
    rejection_reason = Column(String(300), nullable=True)
    # Credit card import tracking fields
    import_source = Column(String(50), nullable=True)  # 'MANUAL', 'CREDIT_CARD'
    credit_card_expense_id = Column(Integer, ForeignKey("credit_card_consolidated_expenses.id"), nullable=True)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    category = relationship("ExpenseCategory", back_populates="expenses")
    travel_expense_report = relationship("TravelExpenseReport", back_populates="expenses")
    factura_supplier = relationship("FacturaSupplier", back_populates="expenses")
    tax = relationship("Tax", back_populates="expenses")
    country = relationship("Country", back_populates="expenses")
    currency = relationship("Currency", back_populates="expenses")
    # Optional: creator for standalone reimbursements
    # Using backref is unnecessary here; read-only usage


class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=False)
    approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    approval_level = Column(Integer, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    approver_user = relationship("User", back_populates="approvals")


class ApprovalHistory(Base):
    __tablename__ = "approval_history"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_role = Column(String(50), nullable=False)
    action = Column(SQLEnum(ApprovalAction), nullable=False)
    from_status = Column(String(50), nullable=False)
    to_status = Column(String(50), nullable=False)
    comments = Column(Text, nullable=True)
    expense_rejections = Column(Text, nullable=True)  # JSON string of expense rejection details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="approval_history")


class ExpenseRejectionHistory(Base):
    __tablename__ = "expense_rejection_history"
    
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("travel_expense_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_role = Column(String(50), nullable=False)
    rejection_reason = Column(String(300), nullable=False)
    approval_stage = Column(String(50), nullable=False)  # SUPERVISOR_PENDING, ACCOUNTING_PENDING, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    expense = relationship("Expense")
    report = relationship("TravelExpenseReport")
    user = relationship("User")


# Email Notification Models
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

# Add indexes for performance
from sqlalchemy import Index

Index('idx_user_email', User.email)
Index('idx_prepayment_user', Prepayment.requesting_user_id)
Index('idx_prepayment_status', Prepayment.status)
Index('idx_expense_report', Expense.travel_expense_report_id)
Index('idx_approval_entity', Approval.entity_type, Approval.entity_id)
Index('idx_approval_user', Approval.approver_user_id)
Index('idx_email_notifications_status', EmailNotification.status)
Index('idx_email_notifications_event_type', EmailNotification.event_type)
Index('idx_email_templates_event_language', EmailTemplate.event_type, EmailTemplate.language)
