"""
Supplier Schemas
Pydantic models for supplier data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SupplierBase(BaseModel):
    """Base supplier schema"""
    name: str = Field(..., min_length=1, max_length=200, description="Supplier name")
    tax_name: str = Field(..., min_length=1, max_length=200, description="Supplier Tax Name / RUC")
    sap_code: str = Field(..., min_length=1, max_length=50, description="SAP code")


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier"""
    pass


class SupplierUpdate(SupplierBase):
    """Schema for updating a supplier"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    tax_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sap_code: Optional[str] = Field(None, min_length=1, max_length=50)


class SupplierResponse(SupplierBase):
    """Schema for supplier response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            name=obj.name,
            tax_name=obj.tax_name,
            sap_code=obj.sap_code,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class SupplierList(BaseModel):
    """Schema for supplier list response"""
    suppliers: list[SupplierResponse]
    total: int
    skip: int
    limit: int

