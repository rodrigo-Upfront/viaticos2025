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
    category_id: Optional[int] = Field(None, description="Expense category ID (optional for credit card imports)")
    travel_expense_report_id: Optional[int] = Field(None, description="Travel expense report ID (omit or null for reimbursement)")
    purpose: Optional[str] = Field(None, max_length=500, description="Purpose of expense (optional for credit card imports)")
    document_type: str = Field(..., description="Document type (Boleta/Factura)")
    boleta_supplier: Optional[str] = Field(None, max_length=200, description="Boleta supplier name")
    factura_supplier_id: Optional[int] = Field(None, description="Factura supplier ID")
    expense_date: date = Field(..., description="Date of expense")
    country_id: Optional[int] = Field(None, description="Country where expense occurred (required for reimbursement)")
    currency_id: Optional[int] = Field(None, description="Currency ID (required for reimbursement)")
    amount: Decimal = Field(..., gt=0, description="Expense amount")
    document_number: Optional[str] = Field(None, max_length=100, description="Document number (optional for credit card imports)")
    taxable: Optional[str] = Field("No", description="Taxable option (Si/No)")
    tax_id: Optional[int] = Field(None, description="Tax ID for taxable invoices")
    document_file: Optional[str] = Field(None, max_length=500, description="Document file path")
    rejection_reason: Optional[str] = Field(None, max_length=300, description="Rejection reason")
    import_source: Optional[str] = Field(None, description="Import source (MANUAL/CREDIT_CARD)")
    credit_card_expense_id: Optional[int] = Field(None, description="Credit card expense ID if imported")


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
    tax_id: Optional[int] = Field(None)
    document_file: Optional[str] = Field(None, max_length=500)
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
    factura_supplier_tax_name: Optional[str] = None
    tax_code: Optional[str] = None
    tax_regime: Optional[str] = None
    travel_expense_report_name: Optional[str] = None
    travel_expense_report_status: Optional[str] = None

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
            tax_id=obj.tax_id,
            document_file=obj.document_file,
            rejection_reason=obj.rejection_reason,
            status=obj.status.value if obj.status else "pending",
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            category_name=obj.category.name if obj.category else None,
            country_name=obj.country.name if obj.country else None,
            currency_name=obj.currency.name if obj.currency else None,
            currency_code=obj.currency.code if obj.currency else None,
            factura_supplier_name=obj.factura_supplier.name if obj.factura_supplier else None,
            factura_supplier_tax_name=obj.factura_supplier.tax_name if obj.factura_supplier else None,
            tax_code=obj.tax.code if obj.tax else None,
            tax_regime=obj.tax.regime if obj.tax else None,
            travel_expense_report_name=(
                obj.travel_expense_report.prepayment.reason if obj.travel_expense_report and obj.travel_expense_report.prepayment 
                else obj.travel_expense_report.reason if obj.travel_expense_report and hasattr(obj.travel_expense_report, 'reason') and obj.travel_expense_report.reason
                else None
            ),
            travel_expense_report_status=(
                obj.travel_expense_report.status.value if obj.travel_expense_report and obj.travel_expense_report.status 
                else None
            )
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
