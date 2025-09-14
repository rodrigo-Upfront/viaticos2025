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
    cost_center = Column(String(100), nullable=False)
    credit_card_number = Column(String(20), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    profile = Column(SQLEnum(UserProfile), nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_approver = Column(Boolean, default=False, nullable=False)
    force_password_change = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    country = relationship("Country", back_populates="users")
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
    name = Column(String(100), unique=True, nullable=False)
    account = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="category")
    country_alerts = relationship("CategoryCountryAlert", back_populates="category")


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


class FacturaSupplier(Base):
    __tablename__ = "factura_suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sap_code = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="factura_supplier")


class Prepayment(Base):
    __tablename__ = "prepayments"
    
    id = Column(Integer, primary_key=True, index=True)
    reason = Column(Text, nullable=False)
    destination_country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    justification_file = Column(String(500), nullable=True)
    comment = Column(Text, nullable=True)
    # Reason provided when a prepayment was rejected in the approval flow
    rejection_reason = Column(Text, nullable=True)
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
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    prepayment = relationship("Prepayment", back_populates="travel_expense_report")
    requesting_user = relationship("User", back_populates="expense_reports")
    expenses = relationship("Expense", back_populates="travel_expense_report")
    country = relationship("Country")
    currency = relationship("Currency")



class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    travel_expense_report_id = Column(Integer, ForeignKey("travel_expense_reports.id"), nullable=True)
    purpose = Column(String(500), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    boleta_supplier = Column(String(200), nullable=True)
    factura_supplier_id = Column(Integer, ForeignKey("factura_suppliers.id"), nullable=True)
    expense_date = Column(Date, nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    document_number = Column(String(100), nullable=False)
    taxable = Column(SQLEnum(TaxableOption), default=TaxableOption.NO, nullable=True)
    document_file = Column(String(500), nullable=True)
    comments = Column(Text, nullable=True)
    rejection_reason = Column(String(300), nullable=True)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    category = relationship("ExpenseCategory", back_populates="expenses")
    travel_expense_report = relationship("TravelExpenseReport", back_populates="expenses")
    factura_supplier = relationship("FacturaSupplier", back_populates="expenses")
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


# Add indexes for performance
from sqlalchemy import Index

Index('idx_user_email', User.email)
Index('idx_prepayment_user', Prepayment.requesting_user_id)
Index('idx_prepayment_status', Prepayment.status)
Index('idx_expense_report', Expense.travel_expense_report_id)
Index('idx_approval_entity', Approval.entity_type, Approval.entity_id)
Index('idx_approval_user', Approval.approver_user_id)
