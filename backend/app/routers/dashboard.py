"""Dashboard Router - with independent country and currency filters"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database.connection import get_db
from app.models.models import (
    User, Prepayment, TravelExpenseReport, Expense, Country, RequestStatus, ExpenseStatus, Currency
)
from app.services.auth_service import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
    currency_id: Optional[int] = Query(None, description="Filter by currency ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics, optionally filtered by country and/or currency"""
    
    # Get filter info for response context
    country_info = None
    if country_id:
        country = db.query(Country).filter(Country.id == country_id).first()
        if country:
            country_info = {
                "id": country.id,
                "name": country.name,
            }

    currency_info = None
    if currency_id:
        currency = db.query(Currency).filter(Currency.id == currency_id).first()
        if currency:
            currency_info = {
                "id": currency.id,
                "name": currency.name,
                "code": currency.code,
                "symbol": currency.symbol,
            }
    
    # Base queries
    prepayments_query = db.query(Prepayment)
    reports_query = db.query(TravelExpenseReport)
    expenses_query = db.query(Expense)
    
    # Apply filters
    if country_id:
        prepayments_query = prepayments_query.filter(Prepayment.destination_country_id == country_id)
        expenses_query = expenses_query.filter(Expense.country_id == country_id)

    if currency_id:
        prepayments_query = prepayments_query.filter(Prepayment.currency_id == currency_id)
        expenses_query = expenses_query.filter(Expense.currency_id == currency_id)

    # Join prepayments to reports only once if either filter requires it
    if country_id or currency_id:
        reports_query = reports_query.join(Prepayment, TravelExpenseReport.prepayment_id == Prepayment.id)
        if country_id:
            reports_query = reports_query.filter(Prepayment.destination_country_id == country_id)
        if currency_id:
            reports_query = reports_query.filter(Prepayment.currency_id == currency_id)
    
    # Calculate stats
    prepayments_pending = prepayments_query.filter(Prepayment.status == RequestStatus.PENDING).count()
    
    # Pending expense reports amount (sum of expenses in pending reports)
    # Avoid duplicate table alias by ensuring only one join to Prepayment is present
    pending_reports = (
        reports_query
        .filter(TravelExpenseReport.status == RequestStatus.PENDING)
        .all()
    )
    expense_reports_pending_amount = 0
    for report in pending_reports:
        if report.expenses:
            expense_reports_pending_amount += sum(exp.amount for exp in report.expenses if exp.amount)
    
    # Pending expenses amount (by expense status)
    expenses_pending_amount = (
        expenses_query.filter(Expense.status == ExpenseStatus.PENDING)
        .with_entities(func.coalesce(func.sum(Expense.amount), 0))
        .scalar()
        or 0
    )
    
    # Approved expenses amount (by expense status)
    expenses_approved_amount = (
        expenses_query.filter(Expense.status == ExpenseStatus.APPROVED)
        .with_entities(func.coalesce(func.sum(Expense.amount), 0))
        .scalar()
        or 0
    )
    
    result = {
        "prepayments_pending": prepayments_pending,
        "expense_reports_pending_amount": float(expense_reports_pending_amount),
        "expenses_pending_amount": float(expenses_pending_amount),
        "expenses_approved_amount": float(expenses_approved_amount),
    }
    
    if country_info:
        result["country"] = country_info
    if currency_info:
        result["currency"] = currency_info
    
    return result


