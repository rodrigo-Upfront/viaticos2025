"""
Pydantic schemas for Credit Card Statement API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class StatementBase(BaseModel):
    original_filename: str
    statement_type: str = "CREDIT_CARD"
    account_number: Optional[str] = None

class StatementCreate(StatementBase):
    pass

class StatementUploadResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    status: str
    message: str

class StatementResponse(StatementBase):
    id: int
    file_size: Optional[int]
    status: str
    processing_notes: Optional[str]
    total_transactions: int = 0
    total_amount_local: Optional[Decimal]
    total_amount_usd: Optional[Decimal]
    statement_period_start: Optional[datetime]
    statement_period_end: Optional[datetime]
    uploaded_by_user_id: int
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True

class StatementTransactionBase(BaseModel):
    transaction_date: datetime
    document_number: Optional[str]
    description: str
    amount_local: Optional[Decimal]
    amount_usd: Optional[Decimal]
    is_personal: bool = False
    notes: Optional[str]

class StatementTransactionCreate(StatementTransactionBase):
    pass

class StatementTransactionUpdate(BaseModel):
    transaction_date: Optional[datetime] = None
    document_number: Optional[str] = None
    description: Optional[str] = None
    amount_local: Optional[Decimal] = None
    amount_usd: Optional[Decimal] = None
    is_personal: Optional[bool] = None
    notes: Optional[str] = None

class StatementTransactionResponse(StatementTransactionBase):
    id: int
    statement_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StatementSummary(BaseModel):
    statement_id: int
    total_transactions: int
    matched_transactions: int
    unmatched_transactions: int
    total_amount_local: Decimal
    total_amount_usd: Decimal
    match_percentage: float

class StatementMatchSuggestion(BaseModel):
    """Suggested matches between statement transactions and expenses"""
    transaction_id: int
    expense_id: int
    confidence_score: float
    match_criteria: dict
    transaction_description: str
    expense_purpose: str
    amount_difference: float

class StatementProcessingStatus(BaseModel):
    statement_id: int
    status: str
    progress_percentage: float
    message: str
    transactions_processed: int
    errors: List[str] = []
