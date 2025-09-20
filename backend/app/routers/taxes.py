"""
Tax Router
Handles tax management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.models import Tax, User
from app.services.auth_service import get_current_user, get_current_superuser
from app.schemas.tax_schemas import (
    TaxCreate, TaxUpdate, TaxResponse, TaxList
)

router = APIRouter()


@router.get("/", response_model=TaxList)
async def get_taxes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by code or regime"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all taxes with optional search
    """
    query = db.query(Tax)
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Tax.code.ilike(search_filter)) |
            (Tax.regime.ilike(search_filter))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    taxes = query.offset(skip).limit(limit).all()
    
    return TaxList(
        taxes=[TaxResponse.from_orm(tax) for tax in taxes],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=TaxResponse)
async def create_tax(
    tax_data: TaxCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Create a new tax (superuser only)
    """
    try:
        # Check if code already exists
        existing_tax = db.query(Tax).filter(Tax.code == tax_data.code).first()
        if existing_tax:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tax code already exists"
            )
        
        # Create tax
        db_tax = Tax(
            code=tax_data.code,
            regime=tax_data.regime
        )
        
        db.add(db_tax)
        db.commit()
        db.refresh(db_tax)
        
        return TaxResponse.from_orm(db_tax)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tax: {str(e)}"
        )


@router.get("/{tax_id}", response_model=TaxResponse)
async def get_tax(
    tax_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific tax by ID
    """
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax not found"
        )
    
    return TaxResponse.from_orm(tax)


@router.put("/{tax_id}", response_model=TaxResponse)
async def update_tax(
    tax_id: int,
    tax_data: TaxUpdate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Update a tax (superuser only)
    """
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax not found"
        )
    
    try:
        # Update fields that are provided
        update_data = tax_data.dict(exclude_unset=True)
        
        # Check code uniqueness if code is being updated
        if "code" in update_data and update_data["code"] != tax.code:
            existing_tax = db.query(Tax).filter(
                Tax.code == update_data["code"],
                Tax.id != tax_id
            ).first()
            if existing_tax:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tax code already exists"
                )
        
        # Update tax
        for field, value in update_data.items():
            setattr(tax, field, value)
        
        db.commit()
        db.refresh(tax)
        
        return TaxResponse.from_orm(tax)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tax: {str(e)}"
        )


@router.delete("/{tax_id}")
async def delete_tax(
    tax_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a tax (superuser only)
    """
    tax = db.query(Tax).filter(Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax not found"
        )
    
    try:
        # Check if tax is being used by any expenses
        from app.models.models import Expense
        expense_count = db.query(Expense).filter(Expense.tax_id == tax_id).count()
        if expense_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete tax. It is being used by {expense_count} expense(s)."
            )
        
        db.delete(tax)
        db.commit()
        
        return {"message": "Tax deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tax: {str(e)}"
        )
