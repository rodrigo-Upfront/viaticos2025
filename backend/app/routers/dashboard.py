"""Dashboard Router - with independent country and currency filters"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from typing import Optional, List
from datetime import datetime, timedelta

from app.database.connection import get_db
from app.models.models import (
    User, Prepayment, TravelExpenseReport, Expense, Country, RequestStatus, ExpenseStatus, Currency, ExpenseCategory
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


@router.get("/monthly-expenses")
async def get_monthly_expenses(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
    currency_id: Optional[int] = Query(None, description="Filter by currency ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly expenses data for the last 6 months"""
    
    # Calculate the last 6 months
    today = datetime.now()
    months_data = []
    
    for i in range(5, -1, -1):  # 6 months ago to current month
        target_date = today - timedelta(days=30 * i)
        year = target_date.year
        month = target_date.month
        
        # Base query for expenses
        expenses_query = db.query(Expense)
        
        # Apply filters
        if country_id:
            expenses_query = expenses_query.filter(Expense.country_id == country_id)
        if currency_id:
            expenses_query = expenses_query.filter(Expense.currency_id == currency_id)
        
        # Filter by month/year and all expenses except rejected ones
        monthly_amount = (
            expenses_query
            .filter(
                extract('year', Expense.expense_date) == year,
                extract('month', Expense.expense_date) == month,
                Expense.status != ExpenseStatus.REJECTED
            )
            .with_entities(func.coalesce(func.sum(Expense.amount), 0))
            .scalar() or 0
        )
        
        month_name = target_date.strftime('%b %Y')
        months_data.append({
            "month": month_name,
            "amount": float(monthly_amount)
        })
    
    return {"monthly_data": months_data}


@router.get("/category-breakdown")
async def get_category_breakdown(
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
    currency_id: Optional[int] = Query(None, description="Filter by currency ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses breakdown by category"""
    
    print(f"🔍 Category breakdown called with filters: country_id={country_id}, currency_id={currency_id}")
    
    # Base query for expenses with category join
    expenses_query = db.query(Expense).join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
    
    # Apply filters
    if country_id:
        expenses_query = expenses_query.filter(Expense.country_id == country_id)
        print(f"🔍 Applied country filter: {country_id}")
    if currency_id:
        expenses_query = expenses_query.filter(Expense.currency_id == currency_id)
        print(f"🔍 Applied currency filter: {currency_id}")
    
    # Get category breakdown for all expenses except rejected ones
    category_data = (
        expenses_query
        .filter(Expense.status != ExpenseStatus.REJECTED)
        .with_entities(
            ExpenseCategory.name,
            func.coalesce(func.sum(Expense.amount), 0).label('total_amount')
        )
        .group_by(ExpenseCategory.name)
        .all()
    )
    
    print(f"🔍 Raw category data from DB: {[(name, float(amount)) for name, amount in category_data]}")
    
    # Calculate total for percentages
    total_amount = sum(float(amount) for _, amount in category_data)
    print(f"🔍 Total amount: {total_amount}")

    # Format data for pie chart
    categories = []
    colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0']

    for i, (name, amount) in enumerate(category_data):
        percentage = (float(amount) / float(total_amount) * 100) if total_amount > 0 else 0
        categories.append({
            "name": name,
            "value": round(percentage, 1),
            "amount": float(amount),
            "color": colors[i % len(colors)]
        })
    
    print(f"🔍 Final categories response: {categories}")
    return {"category_data": categories, "total_amount": float(total_amount)}


@router.get("/recent-prepayments")
async def get_recent_prepayments(
    limit: int = Query(5, description="Number of recent prepayments to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent prepayments"""
    
    recent_prepayments = (
        db.query(Prepayment)
        .join(Country, Prepayment.destination_country_id == Country.id)
        .join(Currency, Prepayment.currency_id == Currency.id)
        .order_by(desc(Prepayment.created_at))
        .limit(limit)
        .all()
    )
    
    result = []
    for prep in recent_prepayments:
        result.append({
            "id": prep.id,
            "reason": prep.reason,
            "country": prep.destination_country.name,
            "start_date": prep.start_date.strftime('%d/%m/%Y') if prep.start_date else '',
            "end_date": prep.end_date.strftime('%d/%m/%Y') if prep.end_date else '',
            "amount": float(prep.amount or 0),
            "currency": prep.currency.code,
            "status": prep.status.value
        })
    
    return {"recent_prepayments": result}


@router.get("/recent-expenses")
async def get_recent_expenses(
    limit: int = Query(5, description="Number of recent expenses to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent expenses"""
    
    recent_expenses = (
        db.query(Expense)
        .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
        .join(Currency, Expense.currency_id == Currency.id)
        .order_by(desc(Expense.created_at))
        .limit(limit)
        .all()
    )
    
    result = []
    for exp in recent_expenses:
        result.append({
            "id": exp.id,
            "category": exp.category.name,
            "purpose": exp.purpose,
            "amount": float(exp.amount or 0),
            "currency": exp.currency.code,
            "status": exp.status.value if exp.status else 'PENDING'
        })
    
    return {"recent_expenses": result}


