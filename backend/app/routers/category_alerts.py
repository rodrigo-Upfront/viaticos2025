from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List

from ..database.connection import get_db
from ..models.models import CategoryCountryAlert, ExpenseCategory, Country, Currency
from ..schemas.category_alert_schemas import (
    CategoryCountryAlert as CategoryCountryAlertSchema,
    CategoryCountryAlertCreate,
    CategoryCountryAlertUpdate,
    CategoryCountryAlertWithDetails
)
from ..services.auth_service import get_current_user, get_current_superuser

router = APIRouter(prefix="/category-alerts", tags=["category-alerts"])


@router.get("/", response_model=List[CategoryCountryAlertWithDetails])
async def get_category_alerts(
    category_id: int = None,
    country_id: int = None,
    currency_id: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Get category country alerts with optional filtering"""
    query = db.query(
        CategoryCountryAlert,
        ExpenseCategory.name.label('category_name'),
        Country.name.label('country_name'),
        Currency.code.label('currency_code'),
        Currency.name.label('currency_name')
    ).join(
        ExpenseCategory, CategoryCountryAlert.category_id == ExpenseCategory.id
    ).join(
        Country, CategoryCountryAlert.country_id == Country.id
    ).join(
        Currency, CategoryCountryAlert.currency_id == Currency.id
    )
    
    if category_id:
        query = query.filter(CategoryCountryAlert.category_id == category_id)
    if country_id:
        query = query.filter(CategoryCountryAlert.country_id == country_id)
    if currency_id:
        query = query.filter(CategoryCountryAlert.currency_id == currency_id)
    
    results = query.all()
    
    alerts = []
    for alert, category_name, country_name, currency_code, currency_name in results:
        alert_dict = {
            "id": alert.id,
            "category_id": alert.category_id,
            "country_id": alert.country_id,
            "currency_id": alert.currency_id,
            "alert_amount": alert.alert_amount,
            "alert_message": getattr(alert, 'alert_message', None),
            "created_at": alert.created_at,
            "updated_at": alert.updated_at,
            "category_name": category_name,
            "country_name": country_name,
            "currency_code": currency_code,
            "currency_name": currency_name
        }
        alerts.append(CategoryCountryAlertWithDetails(**alert_dict))
    
    return alerts


@router.post("/", response_model=CategoryCountryAlertSchema)
async def create_category_alert(
    alert_data: CategoryCountryAlertCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Create a new category country alert"""
    
    # Check if alert already exists for this combination
    existing_alert = db.query(CategoryCountryAlert).filter(
        and_(
            CategoryCountryAlert.category_id == alert_data.category_id,
            CategoryCountryAlert.country_id == alert_data.country_id,
            CategoryCountryAlert.currency_id == alert_data.currency_id
        )
    ).first()
    
    if existing_alert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alert already exists for this category, country, and currency combination"
        )
    
    # Verify that category, country, and currency exist
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == alert_data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    country = db.query(Country).filter(Country.id == alert_data.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    
    currency = db.query(Currency).filter(Currency.id == alert_data.currency_id).first()
    if not currency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Currency not found")
    
    # Create the alert
    db_alert = CategoryCountryAlert(**alert_data.dict())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    return db_alert


@router.put("/{alert_id}", response_model=CategoryCountryAlertSchema)
async def update_category_alert(
    alert_id: int,
    alert_data: CategoryCountryAlertUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Update a category country alert"""
    
    db_alert = db.query(CategoryCountryAlert).filter(CategoryCountryAlert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    # Update only provided fields
    update_data = alert_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_alert, field, value)
    
    db.commit()
    db.refresh(db_alert)
    
    return db_alert


@router.delete("/{alert_id}")
async def delete_category_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_superuser)
):
    """Delete a category country alert"""
    
    db_alert = db.query(CategoryCountryAlert).filter(CategoryCountryAlert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    db.delete(db_alert)
    db.commit()
    
    return {"message": "Alert deleted successfully"}


@router.get("/check-alert/{category_id}/{country_id}/{currency_id}")
async def check_expense_alert(
    category_id: int,
    country_id: int,
    currency_id: int,
    amount: float,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check if an expense amount exceeds the alert threshold"""
    
    alert = db.query(CategoryCountryAlert).filter(
        and_(
            CategoryCountryAlert.category_id == category_id,
            CategoryCountryAlert.country_id == country_id,
            CategoryCountryAlert.currency_id == currency_id
        )
    ).first()
    
    if not alert:
        return {"has_alert": False, "alert_amount": None, "exceeds_alert": False}
    
    exceeds_alert = float(amount) > float(alert.alert_amount)
    
    return {
        "has_alert": True,
        "alert_amount": float(alert.alert_amount),
        "exceeds_alert": exceeds_alert,
        "alert_message": getattr(alert, 'alert_message', None)
    }
