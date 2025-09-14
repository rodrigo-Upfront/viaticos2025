"""
Categories Router
Handles expense category management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import User, ExpenseCategory
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.category_schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryList
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=CategoryList)
async def get_categories(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by name or account"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all categories
    """
    query = db.query(ExpenseCategory)
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (ExpenseCategory.name.ilike(search_filter)) |
            (ExpenseCategory.account.ilike(search_filter))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    categories = query.order_by(ExpenseCategory.name).offset(skip).limit(limit).all()
    
    return CategoryList(
        categories=[CategoryResponse.from_orm(category) for category in categories],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Create a new category (superuser only)
    """
    try:
        # Check if category name already exists
        existing_category = db.query(ExpenseCategory).filter(ExpenseCategory.name == category_data.name).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ExpenseCategory name already exists"
            )
        
        # Check if account already exists
        existing_account = db.query(ExpenseCategory).filter(ExpenseCategory.account == category_data.account).first()
        if existing_account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account already exists"
            )
        
        # Create category
        db_category = ExpenseCategory(
            name=category_data.name,
            account=category_data.account
        )
        
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        
        return CategoryResponse.from_orm(db_category)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific category
    """
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ExpenseCategory not found"
        )
    
    return CategoryResponse.from_orm(category)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Update a category (superuser only)
    """
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ExpenseCategory not found"
        )
    
    try:
        # Update fields that are provided
        update_data = category_data.dict(exclude_unset=True)
        
        # Check name uniqueness if name is being updated
        if "name" in update_data and update_data["name"] != category.name:
            existing_category = db.query(ExpenseCategory).filter(
                ExpenseCategory.name == update_data["name"],
                ExpenseCategory.id != category_id
            ).first()
            if existing_category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ExpenseCategory name already exists"
                )
        
        # Check account uniqueness if account is being updated
        if "account" in update_data and update_data["account"] != category.account:
            existing_account = db.query(ExpenseCategory).filter(
                ExpenseCategory.account == update_data["account"],
                ExpenseCategory.id != category_id
            ).first()
            if existing_account:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account already exists"
                )
        
        # Update category
        for field, value in update_data.items():
            setattr(category, field, value)
        
        category.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(category)
        
        return CategoryResponse.from_orm(category)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update category: {str(e)}"
        )


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a category (superuser only)
    """
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ExpenseCategory not found"
        )
    
    # Check if category has associated expenses
    if category.expenses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated expenses"
        )
    
    try:
        db.delete(category)
        db.commit()
        return {"message": "ExpenseCategory deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete category: {str(e)}"
        )

