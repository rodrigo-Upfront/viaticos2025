"""Dashboard Router - Enhanced with country filtering"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database.connection import get_db
from app.models.models import (
    User, Prepayment, TravelExpenseReport, Expense, Country, RequestStatus
)
from app.services.auth_service import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics, optionally filtered by country"""
    
    # Get country info if specified
    country_info = None
    if country_id:
        country = db.query(Country).filter(Country.id == country_id).first()
        if country:
            country_info = {
                "id": country.id,
                "name": country.name,
                "currency": country.currency
            }
    
    # Base queries
    prepayments_query = db.query(Prepayment)
    reports_query = db.query(TravelExpenseReport)
    expenses_query = db.query(Expense)
    
    # Apply country filter if specified
    if country_id:
        prepayments_query = prepayments_query.filter(Prepayment.destination_country_id == country_id)
        # For reports, filter by prepayment's destination country
        reports_query = reports_query.join(Prepayment).filter(Prepayment.destination_country_id == country_id)
        expenses_query = expenses_query.filter(Expense.country_id == country_id)
    
    # Calculate stats
    prepayments_pending = prepayments_query.filter(Prepayment.status == RequestStatus.PENDING).count()
    
    # Pending expense reports amount
    pending_reports = reports_query.filter(TravelExpenseReport.status == RequestStatus.PENDING).all()
    expense_reports_pending_amount = 0
    for report in pending_reports:
        if report.expenses:
            expense_reports_pending_amount += sum(exp.amount for exp in report.expenses if exp.amount)
    
    # Pending expenses amount
    expenses_pending_amount = expenses_query.filter(
        Expense.status == RequestStatus.PENDING
    ).with_entities(func.coalesce(func.sum(Expense.amount), 0)).scalar() or 0
    
    # Approved expenses amount
    expenses_approved_amount = expenses_query.filter(
        Expense.status == RequestStatus.APPROVED
    ).with_entities(func.coalesce(func.sum(Expense.amount), 0)).scalar() or 0
    
    result = {
        "prepayments_pending": prepayments_pending,
        "expense_reports_pending_amount": float(expense_reports_pending_amount),
        "expenses_pending_amount": float(expenses_pending_amount),
        "expenses_approved_amount": float(expenses_approved_amount)
    }
    
    # Add country info if filtered
    if country_info:
        result["country"] = country_info
    
    return result


