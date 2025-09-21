"""
Accounting Approval Schemas
Pydantic models for accounting approval workflow data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class SAPInvoiceNumberUpdate(BaseModel):
    """Schema for updating SAP invoice numbers for FACTURA expenses"""
    expense_id: int = Field(..., description="Expense ID")
    sap_invoice_number: str = Field(..., min_length=1, max_length=50, description="SAP invoice number")


class SAPInvoiceNumbersRequest(BaseModel):
    """Schema for batch updating SAP invoice numbers"""
    invoice_numbers: List[SAPInvoiceNumberUpdate] = Field(..., description="List of expense SAP invoice number updates")


class AccountingCompensationRequest(BaseModel):
    """Schema for accounting compensation number input"""
    sap_compensation_number: str = Field(..., min_length=1, max_length=50, description="SAP compensation number")


class AccountingApprovalResponse(BaseModel):
    """Schema for accounting approval response"""
    success: bool
    message: str
    report_id: int
    step: int  # Current step in the process
    sap_expenses_file: Optional[str] = None
    sap_compensation_file: Optional[str] = None
    sap_compensation_number: Optional[str] = None
    factura_expenses: Optional[List[Dict]] = None  # For step 2 - invoice number collection


class AccountingApprovalState(BaseModel):
    """Schema for accounting approval state"""
    report_id: int
    step: int  # 1: expenses file, 2: invoice numbers, 3: compensation file, 4: compensation number
    sap_expenses_file: Optional[str] = None
    sap_compensation_file: Optional[str] = None
    sap_compensation_number: Optional[str] = None
    factura_expenses: List[Dict] = []
    completed_steps: List[int] = []
