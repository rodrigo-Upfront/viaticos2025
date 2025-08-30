from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.models.models import Currency
from app.schemas.currency_schemas import CurrencyCreate, CurrencyUpdate, CurrencyResponse
from app.services.auth_service import get_current_user
from app.models.models import User

router = APIRouter()

@router.get("/", response_model=List[CurrencyResponse])
def get_currencies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all currencies - accessible to all authenticated users"""
    currencies = db.query(Currency).order_by(Currency.name).offset(skip).limit(limit).all()
    return currencies

@router.get("/{currency_id}", response_model=CurrencyResponse)
def get_currency(
    currency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific currency by ID"""
    currency = db.query(Currency).filter(Currency.id == currency_id).first()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found"
        )
    return currency

@router.post("/", response_model=CurrencyResponse)
def create_currency(
    currency_data: CurrencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new currency - only accessible to superusers"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can create currencies"
        )
    
    # Check if currency with same name or code already exists
    existing_currency = db.query(Currency).filter(
        (Currency.name == currency_data.name) | (Currency.code == currency_data.code)
    ).first()
    
    if existing_currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency with this name or code already exists"
        )
    
    currency = Currency(**currency_data.model_dump())
    db.add(currency)
    db.commit()
    db.refresh(currency)
    return currency

@router.put("/{currency_id}", response_model=CurrencyResponse)
def update_currency(
    currency_id: int,
    currency_data: CurrencyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a currency - only accessible to superusers"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can update currencies"
        )
    
    currency = db.query(Currency).filter(Currency.id == currency_id).first()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found"
        )
    
    # Check for conflicts with other currencies (excluding current one)
    if currency_data.name or currency_data.code:
        existing_currency = db.query(Currency).filter(
            Currency.id != currency_id,
            (Currency.name == currency_data.name) | (Currency.code == currency_data.code)
        ).first()
        
        if existing_currency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Currency with this name or code already exists"
            )
    
    # Update only provided fields
    update_data = currency_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(currency, field, value)
    
    db.commit()
    db.refresh(currency)
    return currency

@router.delete("/{currency_id}")
def delete_currency(
    currency_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a currency - only accessible to superusers"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can delete currencies"
        )
    
    currency = db.query(Currency).filter(Currency.id == currency_id).first()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found"
        )
    
    # Check if currency is being used
    from app.models.models import Prepayment, Expense
    prepayments_using = db.query(Prepayment).filter(Prepayment.currency_id == currency_id).first()
    expenses_using = db.query(Expense).filter(Expense.currency_id == currency_id).first()
    
    if prepayments_using or expenses_using:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete currency: it is being used by prepayments or expenses"
        )
    
    db.delete(currency)
    db.commit()
    return {"message": "Currency deleted successfully"}