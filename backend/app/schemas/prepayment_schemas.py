"""
Prepayment Schemas
Pydantic models for prepayment data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class PrepaymentBase(BaseModel):
    """Base prepayment schema"""
    reason: str = Field(..., min_length=1, description="Reason for prepayment")
    destination_country_id: int = Field(..., description="Destination country ID")
    start_date: date = Field(..., description="Start date of travel")
    end_date: date = Field(..., description="End date of travel")
    currency: str = Field(..., min_length=3, max_length=3, description="Currency code")
    amount: Decimal = Field(..., gt=0, description="Prepayment amount")
    justification_file: Optional[str] = Field(None, max_length=500, description="Justification file path")
    comment: Optional[str] = Field(None, description="Additional comments")


class PrepaymentCreate(PrepaymentBase):
    """Schema for creating a prepayment"""
    pass


class PrepaymentUpdate(PrepaymentBase):
    """Schema for updating a prepayment"""
    reason: Optional[str] = Field(None, min_length=1)
    destination_country_id: Optional[int] = Field(None)
    start_date: Optional[date] = Field(None)
    end_date: Optional[date] = Field(None)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    amount: Optional[Decimal] = Field(None, gt=0)
    justification_file: Optional[str] = Field(None, max_length=500)
    comment: Optional[str] = Field(None)


class PrepaymentResponse(PrepaymentBase):
    """Schema for prepayment response"""
    id: int
    status: str
    requesting_user_id: int
    created_at: datetime
    updated_at: datetime
    
    # Related data
    destination_country_name: Optional[str] = None
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
            currency=obj.currency,
            amount=obj.amount,
            justification_file=obj.justification_file,
            comment=obj.comment,
            status=obj.status.value if obj.status else "pending",
            requesting_user_id=obj.requesting_user_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            destination_country_name=obj.destination_country.name if obj.destination_country else None,
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
