"""
Travel Expense Report Schemas
Pydantic models for travel expense report data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class ExpenseReportBase(BaseModel):
    """Base expense report schema"""
    prepayment_id: Optional[int] = Field(None, description="Associated prepayment ID (null for reimbursements)")


class ExpenseReportCreate(ExpenseReportBase):
    """Schema for creating an expense report"""
    pass


class ExpenseReportManualCreate(BaseModel):
    """Schema for creating a manual reimbursement report"""
    reason: str = Field(..., description="Reason/Purpose for the reimbursement")
    country_id: int = Field(..., description="Country where expenses occurred")
    currency_id: int = Field(..., description="Currency for expenses")
    start_date: date = Field(..., description="Start date of the trip")
    end_date: date = Field(..., description="End date of the trip")


class ExpenseReportUpdate(BaseModel):
    """Schema for updating an expense report"""
    # Most fields are derived from prepayment and expenses, so minimal update options
    pass


class ExpenseReportResponse(ExpenseReportBase):
    """Schema for expense report response"""
    id: int
    status: str
    requesting_user_id: int
    created_at: datetime
    updated_at: datetime
    report_type: Optional[str] = None
    
    # Related data
    prepayment_reason: Optional[str] = None
    prepayment_amount: Optional[Decimal] = None
    prepayment_destination: Optional[str] = None
    reimbursement_reason: Optional[str] = None
    reimbursement_country: Optional[str] = None
    currency: Optional[str] = None  # Unified currency field for all report types
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    requesting_user_name: Optional[str] = None
    total_expenses: Optional[Decimal] = None
    expense_count: Optional[int] = None
    rejection_reason: Optional[str] = None
    balance: Optional[Decimal] = None  # prepayment_amount - total_expenses
    
    # Fund return fields
    return_document_number: Optional[str] = None
    return_document_files: Optional[List] = None
    
    # SAP fields
    sap_compensation_number: Optional[str] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Calculate totals from expenses
        total_expenses = sum(expense.amount for expense in obj.expenses) if obj.expenses else Decimal('0')
        expense_count = len(obj.expenses) if obj.expenses else 0
        prepayment_amount = obj.prepayment.amount if obj.prepayment else Decimal('0')
        balance = prepayment_amount - total_expenses
        
        return cls(
            id=obj.id,
            prepayment_id=obj.prepayment_id,
            status=obj.status.value if obj.status else "pending",
            requesting_user_id=obj.requesting_user_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            report_type=(obj.report_type.value if getattr(obj, 'report_type', None) else None),
            prepayment_reason=obj.prepayment.reason if obj.prepayment else None,
            prepayment_amount=prepayment_amount,
            prepayment_destination=obj.prepayment.destination_country.name if obj.prepayment and obj.prepayment.destination_country else None,
            reimbursement_reason=getattr(obj, 'reason', None),
            reimbursement_country=(obj.country.name if getattr(obj, 'country', None) else None),
            currency=(
                obj.currency.code if getattr(obj, 'currency', None) and obj.currency
                else obj.prepayment.currency.code if obj.prepayment and obj.prepayment.currency 
                else None
            ),
            start_date=(
                obj.prepayment.start_date if obj.prepayment 
                else getattr(obj, 'start_date', None)
            ),
            end_date=(
                obj.prepayment.end_date if obj.prepayment 
                else getattr(obj, 'end_date', None)
            ),
            requesting_user_name=f"{obj.requesting_user.name} {obj.requesting_user.surname}" if obj.requesting_user else None,
            total_expenses=total_expenses,
            expense_count=expense_count,
            rejection_reason=getattr(obj, 'rejection_reason', None),
            balance=balance,
            return_document_number=getattr(obj, 'return_document_number', None),
            return_document_files=getattr(obj, 'return_document_files', None),
            sap_compensation_number=getattr(obj, 'sap_compensation_number', None)
        )


class ExpenseReportList(BaseModel):
    """Schema for expense report list response"""
    reports: list[ExpenseReportResponse]
    total: int
    skip: int
    limit: int


class ExpenseReportStatusUpdate(BaseModel):
    """Schema for updating expense report status"""
    status: str = Field(..., description="New status")
    comment: Optional[str] = Field(None, description="Status change comment")


class ExpenseReportSummary(BaseModel):
    """Schema for expense report summary/dashboard"""
    total_reports: int
    pending_reports: int
    approved_reports: int
    rejected_reports: int
    total_amount: Decimal
    total_expenses: Decimal
    average_report_amount: Decimal
