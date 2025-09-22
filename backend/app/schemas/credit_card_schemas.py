"""
Credit Card Statement Schemas
Pydantic models for credit card statement import data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal


class CreditCardStatementBase(BaseModel):
    """Base credit card statement schema"""
    filename: str = Field(..., description="Stored filename")
    original_filename: str = Field(..., description="Original uploaded filename")
    status: str = Field(..., description="Processing status")
    total_records: Optional[int] = Field(None, description="Total number of records in file")
    processed_records: Optional[int] = Field(None, description="Number of processed records")


class CreditCardStatementCreate(BaseModel):
    """Schema for creating a credit card statement"""
    original_filename: str = Field(..., description="Original uploaded filename")


class CreditCardStatementResponse(CreditCardStatementBase):
    """Schema for credit card statement response"""
    id: int
    upload_date: datetime
    uploaded_by_user_id: int
    validation_errors: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    # Related data
    uploaded_by_name: Optional[str] = None
    transaction_count: Optional[int] = None
    consolidated_expense_count: Optional[int] = None

    class Config:
        from_attributes = True


class CreditCardTransactionBase(BaseModel):
    """Base credit card transaction schema"""
    credit_card_number: str = Field(..., description="Credit card number")
    transaction_type: str = Field(..., description="Transaction type")
    currency_code: str = Field(..., description="Currency code")
    amount: Decimal = Field(..., description="Transaction amount")
    transaction_date: date = Field(..., description="Transaction date")
    merchant: Optional[str] = Field(None, description="Merchant name")
    description: Optional[str] = Field(None, description="Transaction description")


class CreditCardTransactionCreate(CreditCardTransactionBase):
    """Schema for creating a credit card transaction"""
    statement_id: int = Field(..., description="Statement ID")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw CSV data")


class CreditCardTransactionResponse(CreditCardTransactionBase):
    """Schema for credit card transaction response"""
    id: int
    statement_id: int
    matched_user_id: Optional[int] = None
    consolidated_expense_id: Optional[int] = None
    status: str
    created_at: datetime
    
    # Related data
    matched_user_name: Optional[str] = None
    consolidated_expense_description: Optional[str] = None

    class Config:
        from_attributes = True


class CreditCardConsolidatedExpenseBase(BaseModel):
    """Base consolidated expense schema"""
    credit_card_number: str = Field(..., description="Credit card number")
    currency_code: str = Field(..., description="Currency code")
    total_amount: Decimal = Field(..., description="Total consolidated amount")
    expense_date: date = Field(..., description="Expense date (max from group)")
    expense_description: str = Field(..., description="Expense description")
    supplier_name: str = Field(..., description="Supplier name")
    transaction_count: int = Field(..., description="Number of transactions consolidated")


class CreditCardConsolidatedExpenseCreate(CreditCardConsolidatedExpenseBase):
    """Schema for creating a consolidated expense"""
    statement_id: int = Field(..., description="Statement ID")
    source_transaction_ids: List[int] = Field(..., description="Source transaction IDs")
    matched_user_id: int = Field(..., description="Matched user ID")


class CreditCardConsolidatedExpenseResponse(CreditCardConsolidatedExpenseBase):
    """Schema for consolidated expense response"""
    id: int
    statement_id: int
    source_transaction_ids: List[int]
    matched_user_id: int
    associated_prepayment_id: Optional[int] = None
    created_expense_id: Optional[int] = None
    status: str
    created_at: datetime
    
    # Related data
    matched_user_name: Optional[str] = None
    associated_prepayment_reason: Optional[str] = None
    created_expense_purpose: Optional[str] = None

    class Config:
        from_attributes = True


class CreditCardUploadResponse(BaseModel):
    """Response after uploading a credit card statement"""
    statement_id: int
    filename: str
    total_records: int
    validation_errors: Optional[Dict[str, Any]] = None
    user_currency_combinations: List[Dict[str, Any]]  # For prepayment form


class CreditCardProcessingRequest(BaseModel):
    """Request to process uploaded credit card statement"""
    statement_id: int
    prepayment_data: List[Dict[str, Any]] = Field(..., description="Prepayment data for each user-currency combination")


class CreditCardProcessingResponse(BaseModel):
    """Response after processing credit card statement"""
    statement_id: int
    created_prepayments: List[int]
    created_expenses: List[int]
    processing_summary: Dict[str, Any]


class UserCurrencyCombination(BaseModel):
    """User-currency combination for prepayment creation"""
    user_id: int
    user_name: str
    credit_card_number: str
    currency_code: str
    currency_name: str
    transaction_count: int
    total_amount: Decimal
    consolidated_expenses: List[CreditCardConsolidatedExpenseResponse]


class PrepaymentFormData(BaseModel):
    """Form data for creating prepayments from credit card transactions"""
    user_id: int
    currency_code: str
    reason: str = Field(..., min_length=1, max_length=500)
    country_id: int = Field(..., description="Destination country ID")
    start_date: date = Field(..., description="Travel start date")
    end_date: date = Field(..., description="Travel end date")
    comment: Optional[str] = Field(None, description="Additional comments")


class CreditCardStatementList(BaseModel):
    """Schema for credit card statement list response"""
    statements: List[CreditCardStatementResponse]
    total: int
    skip: int
    limit: int


class CreditCardDashboardStats(BaseModel):
    """Dashboard statistics for credit card statements"""
    total_statements: int
    pending_processing: int
    completed_processing: int
    total_transactions: int
    total_consolidated_expenses: int
    total_created_prepayments: int
    recent_statements: List[CreditCardStatementResponse]
