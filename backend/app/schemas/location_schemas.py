"""
Pydantic schemas for Location and LocationCurrency models
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime


# LocationCurrency schemas
class LocationCurrencyBase(BaseModel):
    currency_id: int = Field(..., description="Currency ID")
    account: str = Field(..., description="Account code for this location-currency combination", min_length=1, max_length=255)


class LocationCurrencyCreate(LocationCurrencyBase):
    pass


class LocationCurrencyUpdate(BaseModel):
    account: Optional[str] = Field(None, description="Account code for this location-currency combination", min_length=1, max_length=255)


class LocationCurrency(LocationCurrencyBase):
    id: int
    location_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LocationCurrencyWithDetails(LocationCurrency):
    currency_code: Optional[str] = None
    currency_name: Optional[str] = None


# Location schemas
class LocationBase(BaseModel):
    name: str = Field(..., description="Location name", min_length=1, max_length=255)
    sap_code: str = Field(..., description="SAP code for the location", min_length=1, max_length=50)
    cost_center: str = Field(..., description="Cost center for the location", min_length=1, max_length=100)

    @validator('sap_code')
    def validate_sap_code(cls, v):
        if not v or not v.strip():
            raise ValueError('SAP code is required')
        return v.strip().upper()

    @validator('name', 'cost_center')
    def validate_required_fields(cls, v):
        if not v or not v.strip():
            raise ValueError('This field is required')
        return v.strip()


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Location name", min_length=1, max_length=255)
    sap_code: Optional[str] = Field(None, description="SAP code for the location", min_length=1, max_length=50)
    cost_center: Optional[str] = Field(None, description="Cost center for the location", min_length=1, max_length=100)

    @validator('sap_code')
    def validate_sap_code(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('SAP code cannot be empty')
            return v.strip().upper()
        return v

    @validator('name', 'cost_center')
    def validate_non_empty_fields(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('This field cannot be empty')
            return v.strip()
        return v


class Location(LocationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LocationWithCurrencies(Location):
    location_currencies: List[LocationCurrencyWithDetails] = []


class LocationList(BaseModel):
    """Response model for paginated location lists"""
    locations: List[Location]
    total: int
    page: int
    per_page: int
    pages: int
