"""
Travel Expense Report Schemas
Pydantic models for travel expense report data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ExpenseReportBase(BaseModel):
    """Base expense report schema"""
    prepayment_id: int = Field(..., description="Associated prepayment ID")


class ExpenseReportCreate(ExpenseReportBase):
    """Schema for creating an expense report"""
    pass


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
    
    # Related data
    prepayment_reason: Optional[str] = None
    prepayment_amount: Optional[Decimal] = None
    prepayment_currency: Optional[str] = None
    prepayment_destination: Optional[str] = None
    requesting_user_name: Optional[str] = None
    total_expenses: Optional[Decimal] = None
    expense_count: Optional[int] = None
    balance: Optional[Decimal] = None  # prepayment_amount - total_expenses

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
            prepayment_reason=obj.prepayment.reason if obj.prepayment else None,
            prepayment_amount=prepayment_amount,
            prepayment_currency=(obj.prepayment.currency.code if obj.prepayment and obj.prepayment.currency else None),
            prepayment_destination=obj.prepayment.destination_country.name if obj.prepayment and obj.prepayment.destination_country else None,
            requesting_user_name=f"{obj.requesting_user.name} {obj.requesting_user.surname}" if obj.requesting_user else None,
            total_expenses=total_expenses,
            expense_count=expense_count,
            balance=balance
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
