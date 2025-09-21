"""
Category Schemas
Pydantic models for expense category data validation and serialization
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=1, max_length=200, description="Category name")
    account: str = Field(..., min_length=1, max_length=50, description="SAP account")
    location_id: int = Field(..., description="Location ID this category belongs to")
    # Category-level alert removed in favor of per-country/currency alerts


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    pass


class CategoryUpdate(CategoryBase):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    account: Optional[str] = Field(None, min_length=1, max_length=50)
    # No alert_amount here


class CategoryResponse(CategoryBase):
    """Schema for category response"""
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
            account=obj.account,
            location_id=obj.location_id,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class CategoryCountryAlert(BaseModel):
    """Schema for category country alert"""
    category_id: int
    country_id: int
    country_name: str
    alert_amount: Decimal
    
    @validator('alert_amount', pre=True)
    def validate_alert_amount(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class CategoryCountryAlertCreate(BaseModel):
    """Schema for creating category country alert"""
    country_id: int
    alert_amount: Decimal
    
    @validator('alert_amount', pre=True)
    def validate_alert_amount(cls, v):
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class CategoryResponseWithAlerts(CategoryBase):
    """Schema for category response with country alerts"""
    id: int
    created_at: datetime
    updated_at: datetime
    country_alerts: List[CategoryCountryAlert] = []

    class Config:
        from_attributes = True


class CategoryList(BaseModel):
    """Schema for category list response"""
    categories: list[CategoryResponse]
    total: int
    skip: int
    limit: int

