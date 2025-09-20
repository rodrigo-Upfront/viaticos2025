"""
Prepayment Schemas
Pydantic models for prepayment data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal


class PrepaymentBase(BaseModel):
    """Base prepayment schema"""
    reason: str = Field(..., min_length=1, description="Reason for prepayment")
    destination_country_id: int = Field(..., description="Destination country ID")
    start_date: date = Field(..., description="Start date of travel")
    end_date: date = Field(..., description="End date of travel")
    currency_id: int = Field(..., description="Currency ID")
    amount: Decimal = Field(..., gt=0, description="Prepayment amount")
    justification_files: Optional[List[Dict[str, Any]]] = Field(None, description="List of justification files: [{'filename': '...', 'original_name': '...', 'file_path': '...'}]")
    comment: Optional[str] = Field(None, description="Additional comments")
    rejection_reason: Optional[str] = Field(None, description="Rejection reason (set when rejected)")


class PrepaymentCreate(PrepaymentBase):
    """Schema for creating a prepayment"""
    pass


class PrepaymentUpdate(PrepaymentBase):
    """Schema for updating a prepayment"""
    reason: Optional[str] = Field(None, min_length=1)
    destination_country_id: Optional[int] = Field(None)
    start_date: Optional[date] = Field(None)
    end_date: Optional[date] = Field(None)
    currency_id: Optional[int] = Field(None)
    amount: Optional[Decimal] = Field(None, gt=0)
    justification_files: Optional[List[Dict[str, Any]]] = Field(None)
    comment: Optional[str] = Field(None)
    rejection_reason: Optional[str] = Field(None)


class PrepaymentResponse(PrepaymentBase):
    """Schema for prepayment response"""
    id: int
    status: str
    requesting_user_id: int
    deposit_number: Optional[str] = Field(None, description="Treasury deposit number")
    sap_prepayment_file: Optional[str] = Field(None, description="SAP prepayment file path")
    sap_record_number: Optional[str] = Field(None, description="SAP record number")
    created_at: datetime
    updated_at: datetime
    
    # Related data
    destination_country_name: Optional[str] = None
    currency_name: Optional[str] = None
    currency_code: Optional[str] = None
    requesting_user_name: Optional[str] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            reason=obj.reason,
            destination_country_id=obj.destination_country_id,
            start_date=obj.start_date,
            end_date=obj.end_date,
            currency_id=obj.currency_id,
            amount=obj.amount,
            justification_files=obj.justification_files,
            comment=obj.comment,
            rejection_reason=getattr(obj, 'rejection_reason', None),
            status=obj.status.value if obj.status else "pending",
            requesting_user_id=obj.requesting_user_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            destination_country_name=obj.destination_country.name if obj.destination_country else None,
            currency_name=obj.currency.name if obj.currency else None,
            currency_code=obj.currency.code if obj.currency else None,
            requesting_user_name=f"{obj.requesting_user.name} {obj.requesting_user.surname}" if obj.requesting_user else None
        )


class PrepaymentList(BaseModel):
    """Schema for prepayment list response"""
    prepayments: list[PrepaymentResponse]
    total: int
    skip: int
    limit: int


class PrepaymentStatusUpdate(BaseModel):
    """Schema for updating prepayment status"""
    status: str = Field(..., description="New status")
    comment: Optional[str] = Field(None, description="Status change comment")


class TreasuryDepositRequest(BaseModel):
    """Schema for treasury deposit number input"""
    deposit_number: str = Field(..., min_length=1, max_length=20, description="Treasury deposit number")


class TreasurySAPRecordRequest(BaseModel):
    """Schema for treasury SAP record number input"""
    sap_record_number: str = Field(..., min_length=1, max_length=20, description="SAP record number")


class TreasuryApprovalResponse(BaseModel):
    """Schema for treasury approval response"""
    success: bool
    message: str
    prepayment_id: int
    deposit_number: Optional[str] = None
    sap_file_path: Optional[str] = None
    sap_record_number: Optional[str] = None
    status: str
