"""
FacturaSuppliers Router
Handles supplier (factura supplier) management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import User, FacturaSupplier
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.supplier_schemas import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierList
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=SupplierList)
async def get_suppliers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by name or SAP code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all suppliers
    """
    query = db.query(FacturaSupplier)
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (FacturaSupplier.name.ilike(search_filter)) |
            (FacturaSupplier.sap_code.ilike(search_filter))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    suppliers = query.order_by(FacturaSupplier.name).offset(skip).limit(limit).all()
    
    return SupplierList(
        suppliers=[SupplierResponse.from_orm(supplier) for supplier in suppliers],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Create a new supplier (superuser only)
    """
    try:
        # Check if supplier name already exists
        existing_supplier = db.query(FacturaSupplier).filter(FacturaSupplier.name == supplier_data.name).first()
        if existing_supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FacturaSupplier name already exists"
            )
        
        # Check if SAP code already exists
        existing_sap = db.query(FacturaSupplier).filter(FacturaSupplier.sap_code == supplier_data.sap_code).first()
        if existing_sap:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SAP code already exists"
            )
        
        # Create supplier
        db_supplier = FacturaSupplier(
            name=supplier_data.name,
            sap_code=supplier_data.sap_code
        )
        
        db.add(db_supplier)
        db.commit()
        db.refresh(db_supplier)
        
        return SupplierResponse.from_orm(db_supplier)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create supplier: {str(e)}"
        )


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific supplier
    """
    supplier = db.query(FacturaSupplier).filter(FacturaSupplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FacturaSupplier not found"
        )
    
    return SupplierResponse.from_orm(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Update a supplier (superuser only)
    """
    supplier = db.query(FacturaSupplier).filter(FacturaSupplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FacturaSupplier not found"
        )
    
    try:
        # Update fields that are provided
        update_data = supplier_data.dict(exclude_unset=True)
        
        # Check name uniqueness if name is being updated
        if "name" in update_data and update_data["name"] != supplier.name:
            existing_supplier = db.query(FacturaSupplier).filter(
                FacturaSupplier.name == update_data["name"],
                FacturaSupplier.id != supplier_id
            ).first()
            if existing_supplier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="FacturaSupplier name already exists"
                )
        
        # Check SAP code uniqueness if SAP code is being updated
        if "sap_code" in update_data and update_data["sap_code"] != supplier.sap_code:
            existing_sap = db.query(FacturaSupplier).filter(
                FacturaSupplier.sap_code == update_data["sap_code"],
                FacturaSupplier.id != supplier_id
            ).first()
            if existing_sap:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SAP code already exists"
                )
        
        # Update supplier
        for field, value in update_data.items():
            setattr(supplier, field, value)
        
        supplier.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(supplier)
        
        return SupplierResponse.from_orm(supplier)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update supplier: {str(e)}"
        )


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a supplier (superuser only)
    """
    supplier = db.query(FacturaSupplier).filter(FacturaSupplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FacturaSupplier not found"
        )
    
    # Check if supplier has associated expenses
    if supplier.expenses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete supplier with associated expenses"
        )
    
    try:
        db.delete(supplier)
        db.commit()
        return {"message": "FacturaSupplier deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete supplier: {str(e)}"
        )

