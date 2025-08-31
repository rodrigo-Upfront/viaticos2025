"""
Expense Schemas
Pydantic models for expense data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class ExpenseBase(BaseModel):
    """Base expense schema"""
    category_id: int = Field(..., description="Expense category ID")
    travel_expense_report_id: Optional[int] = Field(None, description="Travel expense report ID (omit or null for reimbursement)")
    purpose: str = Field(..., min_length=1, max_length=500, description="Purpose of expense")
    document_type: str = Field(..., description="Document type (Boleta/Factura)")
    boleta_supplier: Optional[str] = Field(None, max_length=200, description="Boleta supplier name")
    factura_supplier_id: Optional[int] = Field(None, description="Factura supplier ID")
    expense_date: date = Field(..., description="Date of expense")
    country_id: Optional[int] = Field(None, description="Country where expense occurred (required for reimbursement)")
    currency_id: Optional[int] = Field(None, description="Currency ID (required for reimbursement)")
    amount: Decimal = Field(..., gt=0, description="Expense amount")
    document_number: str = Field(..., min_length=1, max_length=100, description="Document number")
    taxable: Optional[str] = Field("No", description="Taxable option (Si/No)")
    document_file: Optional[str] = Field(None, max_length=500, description="Document file path")
    comments: Optional[str] = Field(None, description="Additional comments")
    rejection_reason: Optional[str] = Field(None, max_length=300, description="Rejection reason")


class ExpenseCreate(ExpenseBase):
    """Schema for creating an expense"""
    # For creation, country and currency will be inherited from the report's prepayment
    country_id: Optional[int] = Field(None)
    currency_id: Optional[int] = Field(None)


class ExpenseUpdate(ExpenseBase):
    """Schema for updating an expense"""
    category_id: Optional[int] = Field(None)
    travel_expense_report_id: Optional[int] = Field(None)
    purpose: Optional[str] = Field(None, min_length=1, max_length=500)
    document_type: Optional[str] = Field(None)
    boleta_supplier: Optional[str] = Field(None, max_length=200)
    factura_supplier_id: Optional[int] = Field(None)
    expense_date: Optional[date] = Field(None)
    country_id: Optional[int] = Field(None)
    currency_id: Optional[int] = Field(None)
    amount: Optional[Decimal] = Field(None, gt=0)
    document_number: Optional[str] = Field(None, min_length=1, max_length=100)
    taxable: Optional[str] = Field(None)
    document_file: Optional[str] = Field(None, max_length=500)
    comments: Optional[str] = Field(None)
    rejection_reason: Optional[str] = Field(None, max_length=300)


class ExpenseResponse(ExpenseBase):
    """Schema for expense response"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[int] = None
    
    # Related data
    category_name: Optional[str] = None
    country_name: Optional[str] = None
    currency_name: Optional[str] = None
    currency_code: Optional[str] = None
    factura_supplier_name: Optional[str] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            category_id=obj.category_id,
            travel_expense_report_id=obj.travel_expense_report_id,
            purpose=obj.purpose,
            document_type=obj.document_type.value if obj.document_type else "Boleta",
            boleta_supplier=obj.boleta_supplier,
            factura_supplier_id=obj.factura_supplier_id,
            expense_date=obj.expense_date,
            country_id=obj.country_id,
            currency_id=obj.currency_id,
            amount=obj.amount,
            document_number=obj.document_number,
            taxable=obj.taxable.value if obj.taxable else "No",
            document_file=obj.document_file,
            comments=obj.comments,
            rejection_reason=obj.rejection_reason,
            status=obj.status.value if obj.status else "pending",
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            category_name=obj.category.name if obj.category else None,
            country_name=obj.country.name if obj.country else None,
            currency_name=obj.currency.name if obj.currency else None,
            currency_code=obj.currency.code if obj.currency else None,
            factura_supplier_name=obj.factura_supplier.name if obj.factura_supplier else None
        )


class ExpenseList(BaseModel):
    """Schema for expense list response"""
    expenses: list[ExpenseResponse]
    total: int
    skip: int
    limit: int


class ExpenseStatusUpdate(BaseModel):
    """Schema for updating expense status"""
    status: str = Field(..., description="New status")
    comments: Optional[str] = Field(None, description="Status change comments")
