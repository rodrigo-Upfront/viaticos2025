"""
Country Schemas
Pydantic models for country-related requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CountryBase(BaseModel):
    """Base country schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Country name")
    currency: str = Field(..., min_length=1, max_length=10, description="Country currency code")


class CountryCreate(CountryBase):
    """Country creation schema"""
    pass


class CountryUpdate(BaseModel):
    """Country update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Country name")
    currency: Optional[str] = Field(None, min_length=1, max_length=10, description="Country currency code")


class CountryResponse(CountryBase):
    """Country response schema"""
    id: int = Field(..., description="Country ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, country):
        """Create CountryResponse from ORM model"""
        return cls(
            id=country.id,
            name=country.name,
            currency=country.currency,
            created_at=country.created_at,
            updated_at=country.updated_at
        )


class CountryOption(BaseModel):
    """Country option schema for dropdowns"""
    id: int = Field(..., description="Country ID")
    name: str = Field(..., description="Country name")
    currency: str = Field(..., description="Currency code")
    
    @classmethod
    def from_orm(cls, country):
        """Create CountryOption from ORM model"""
        return cls(
            id=country.id,
            name=country.name,
            currency=country.currency
        )

