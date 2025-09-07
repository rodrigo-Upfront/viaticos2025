from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CategoryCountryAlertBase(BaseModel):
    category_id: int
    country_id: int
    currency_id: int
    alert_amount: Decimal


class CategoryCountryAlertCreate(CategoryCountryAlertBase):
    pass


class CategoryCountryAlertUpdate(BaseModel):
    alert_amount: Optional[Decimal] = None


class CategoryCountryAlert(CategoryCountryAlertBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CategoryCountryAlertWithDetails(CategoryCountryAlert):
    category_name: Optional[str] = None
    country_name: Optional[str] = None
    currency_code: Optional[str] = None
    currency_name: Optional[str] = None
