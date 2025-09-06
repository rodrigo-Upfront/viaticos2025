"""
Database models for Credit Card Statement processing
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum

from app.database.connection import Base

class StatementType(PyEnum):
    CREDIT_CARD = "CREDIT_CARD"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    CORPORATE_CARD = "CORPORATE_CARD"

class StatementStatus(PyEnum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    MATCHED = "MATCHED"
    REJECTED = "REJECTED"

class CreditCardStatement(Base):
    """Credit card/bank statement records"""
    __tablename__ = "credit_card_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # File information
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    
    # Statement information
    statement_type = Column(Enum(StatementType), default=StatementType.CREDIT_CARD)
    account_number = Column(String(50))
    statement_period_start = Column(DateTime)
    statement_period_end = Column(DateTime)
    
    # Processing status
    status = Column(Enum(StatementStatus), default=StatementStatus.PENDING)
    processing_notes = Column(Text)
    
    # Totals for validation
    total_transactions = Column(Integer, default=0)
    total_amount_local = Column(Numeric(12, 2))
    total_amount_usd = Column(Numeric(12, 2))
    
    # User and timestamps
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime)
    
    # Relationships
    uploaded_by = relationship("User", back_populates="statements")
    transactions = relationship("StatementTransaction", back_populates="statement", cascade="all, delete-orphan")


class StatementTransaction(Base):
    """Individual transactions extracted from statements"""
    __tablename__ = "statement_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    statement_id = Column(Integer, ForeignKey("credit_card_statements.id"), nullable=False)
    
    # Transaction details
    transaction_date = Column(DateTime, nullable=False)
    document_number = Column(String(100))  # Comprobante
    description = Column(Text, nullable=False)  # Detalle
    
    # Amounts
    amount_local = Column(Numeric(12, 2))  # M.LOC (PEN)
    amount_usd = Column(Numeric(12, 2))    # USD
    
    # Manual overrides
    is_personal = Column(Boolean, default=False)  # Mark as personal expense (not business)
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    statement = relationship("CreditCardStatement", back_populates="transactions")


