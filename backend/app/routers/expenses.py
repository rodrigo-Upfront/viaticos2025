"""
Expenses Router
Handles expense management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import (
    User, Expense, ExpenseCategory, Country, FacturaSupplier, 
    TravelExpenseReport, Prepayment, ExpenseStatus, DocumentType, TaxableOption
)
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.expense_schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, 
    ExpenseList, ExpenseStatusUpdate
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=ExpenseList)
async def get_expenses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by purpose or document number"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    report_id: Optional[int] = Query(None, description="Filter by travel expense report ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all expenses (filtered by user permissions)
    """
    query = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.country),
        joinedload(Expense.factura_supplier),
        joinedload(Expense.travel_expense_report)
    )
    
    # Filter by travel expense report if specified
    if report_id:
        query = query.filter(Expense.travel_expense_report_id == report_id)
    
    # Non-superusers can only see expenses from their own reports
    if not current_user.is_superuser:
        query = query.join(TravelExpenseReport).filter(
            TravelExpenseReport.requesting_user_id == current_user.id
        )
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Expense.purpose.ilike(search_filter)) |
            (Expense.document_number.ilike(search_filter))
        )
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = ExpenseStatus(status_filter)
            query = query.filter(Expense.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
    
    return ExpenseList(
        expenses=[ExpenseResponse.from_orm(expense) for expense in expenses],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific expense by ID
    """
    expense = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.country),
        joinedload(Expense.factura_supplier),
        joinedload(Expense.travel_expense_report)
    ).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        report = expense.travel_expense_report
        if report and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return ExpenseResponse.from_orm(expense)


@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new expense
    """
    # Verify related entities exist
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense_data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == expense_data.travel_expense_report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel expense report not found")
    
    country = db.query(Country).filter(Country.id == expense_data.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    
    # Check permissions
    if not current_user.is_superuser and report.requesting_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to add expenses to this report"
        )
    
    # Verify factura supplier if provided and document type is Factura
    if expense_data.factura_supplier_id and expense_data.factura_supplier_id > 0:
        supplier = db.query(FacturaSupplier).filter(FacturaSupplier.id == expense_data.factura_supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura supplier not found")
    
    # Get country and currency from the travel expense report's prepayment
    report_with_prepayment = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country)
    ).filter(TravelExpenseReport.id == expense_data.travel_expense_report_id).first()
    
    if not report_with_prepayment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel expense report not found")
    
    # Inherit country and currency from prepayment
    inherited_country_id = report_with_prepayment.prepayment.destination_country_id
    inherited_currency = report_with_prepayment.prepayment.currency
    
    try:
        # Build fields explicitly to avoid duplicate keyword errors
        payload = expense_data.model_dump()
        # Remove raw string enums that we will set as proper enums and status which we set manually
        payload.pop("document_type", None)
        payload.pop("taxable", None)
        payload.pop("status", None)  # Remove status if it exists in payload
        
        # Override country and currency with inherited values
        payload["country_id"] = inherited_country_id
        payload["currency"] = inherited_currency
        
        # Handle factura_supplier_id for Boleta documents
        if expense_data.document_type.upper() == "BOLETA":
            payload["factura_supplier_id"] = None
        elif payload.get("factura_supplier_id") == 0:
            payload["factura_supplier_id"] = None

        expense = Expense(
            **payload,
            document_type=DocumentType(expense_data.document_type),
            taxable=TaxableOption(expense_data.taxable),
            status=ExpenseStatus.PENDING
        )
        
        db.add(expense)
        db.commit()
        db.refresh(expense)
        
        # Load relationships for response
        expense = db.query(Expense).options(
            joinedload(Expense.category),
            joinedload(Expense.country),
            joinedload(Expense.factura_supplier)
        ).filter(Expense.id == expense.id).first()
        
        return ExpenseResponse.from_orm(expense)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense: {str(e)}"
        )


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an expense
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        report = expense.travel_expense_report
        if report and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        if expense.status != ExpenseStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only edit pending expenses"
            )
    
    try:
        # Update only provided fields
        update_data = expense_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "document_type" and value:
                setattr(expense, field, DocumentType(value))
            elif field == "taxable" and value:
                setattr(expense, field, TaxableOption(value))
            else:
                setattr(expense, field, value)
        
        expense.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(expense)
        
        # Load relationships for response
        expense = db.query(Expense).options(
            joinedload(Expense.category),
            joinedload(Expense.country),
            joinedload(Expense.factura_supplier)
        ).filter(Expense.id == expense.id).first()
        
        return ExpenseResponse.from_orm(expense)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update expense: {str(e)}"
        )


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete an expense (superuser only)
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    try:
        db.delete(expense)
        db.commit()
        
        return {"message": "Expense deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete expense: {str(e)}"
        )
