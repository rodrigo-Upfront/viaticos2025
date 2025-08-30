"""
Currency Schemas for Viaticos 2025
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CurrencyBase(BaseModel):
    name: str
    code: str
    symbol: Optional[str] = None


class CurrencyCreate(CurrencyBase):
    pass


class CurrencyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    symbol: Optional[str] = None


class CurrencyResponse(CurrencyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

