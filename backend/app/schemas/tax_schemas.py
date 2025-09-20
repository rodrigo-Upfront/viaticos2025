"""
Tax Schemas
Pydantic models for tax data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TaxBase(BaseModel):
    """Base tax schema"""
    code: str = Field(..., min_length=1, max_length=50, description="Tax code")
    regime: str = Field(..., min_length=1, max_length=200, description="Tax regime")


class TaxCreate(TaxBase):
    """Schema for creating a tax"""
    pass


class TaxUpdate(BaseModel):
    """Schema for updating a tax"""
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="Tax code")
    regime: Optional[str] = Field(None, min_length=1, max_length=200, description="Tax regime")


class TaxResponse(TaxBase):
    """Schema for tax response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            code=obj.code,
            regime=obj.regime,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class TaxList(BaseModel):
    """Schema for tax list response"""
    taxes: list[TaxResponse]
    total: int
    skip: int
    limit: int
