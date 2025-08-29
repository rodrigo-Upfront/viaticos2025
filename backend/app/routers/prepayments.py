"""
Prepayments Router
Handles prepayment management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import User, Prepayment, Country, RequestStatus
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.prepayment_schemas import (
    PrepaymentCreate, PrepaymentUpdate, PrepaymentResponse, 
    PrepaymentList, PrepaymentStatusUpdate
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=PrepaymentList)
async def get_prepayments(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by reason or destination"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all prepayments for the current user (or all if superuser)
    """
    query = db.query(Prepayment).options(
        joinedload(Prepayment.destination_country),
        joinedload(Prepayment.requesting_user)
    )
    
    # Non-superusers can only see their own prepayments
    if not current_user.is_superuser:
        query = query.filter(Prepayment.requesting_user_id == current_user.id)
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.join(Country).filter(
            (Prepayment.reason.ilike(search_filter)) |
            (Country.name.ilike(search_filter))
        )
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = RequestStatus(status_filter)
            query = query.filter(Prepayment.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    prepayments = query.order_by(Prepayment.created_at.desc()).offset(skip).limit(limit).all()
    
    return PrepaymentList(
        prepayments=[PrepaymentResponse.from_orm(prepayment) for prepayment in prepayments],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{prepayment_id}", response_model=PrepaymentResponse)
async def get_prepayment(
    prepayment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific prepayment by ID
    """
    prepayment = db.query(Prepayment).options(
        joinedload(Prepayment.destination_country),
        joinedload(Prepayment.requesting_user)
    ).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Non-superusers can only access their own prepayments
    if not current_user.is_superuser and prepayment.requesting_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return PrepaymentResponse.from_orm(prepayment)


@router.post("/", response_model=PrepaymentResponse)
async def create_prepayment(
    prepayment_data: PrepaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new prepayment
    """
    # Verify destination country exists
    country = db.query(Country).filter(Country.id == prepayment_data.destination_country_id).first()
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination country not found"
        )
    
    # Validate date range
    if prepayment_data.start_date >= prepayment_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    try:
        prepayment = Prepayment(
            **prepayment_data.model_dump(),
            requesting_user_id=current_user.id,
            status=RequestStatus.PENDING
        )
        
        db.add(prepayment)
        db.commit()
        db.refresh(prepayment)
        
        # Load relationships for response
        prepayment = db.query(Prepayment).options(
            joinedload(Prepayment.destination_country),
            joinedload(Prepayment.requesting_user)
        ).filter(Prepayment.id == prepayment.id).first()
        
        return PrepaymentResponse.from_orm(prepayment)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prepayment: {str(e)}"
        )


@router.put("/{prepayment_id}", response_model=PrepaymentResponse)
async def update_prepayment(
    prepayment_id: int,
    prepayment_data: PrepaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a prepayment
    """
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Non-superusers can only update their own prepayments and only if pending
    if not current_user.is_superuser:
        if prepayment.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        if prepayment.status != RequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only edit pending prepayments"
            )
    
    # Verify destination country exists if being updated
    if prepayment_data.destination_country_id:
        country = db.query(Country).filter(Country.id == prepayment_data.destination_country_id).first()
        if not country:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination country not found"
            )
    
    # Validate date range if dates are being updated
    start_date = prepayment_data.start_date or prepayment.start_date
    end_date = prepayment_data.end_date or prepayment.end_date
    if start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    try:
        # Update only provided fields
        update_data = prepayment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(prepayment, field, value)
        
        prepayment.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(prepayment)
        
        # Load relationships for response
        prepayment = db.query(Prepayment).options(
            joinedload(Prepayment.destination_country),
            joinedload(Prepayment.requesting_user)
        ).filter(Prepayment.id == prepayment.id).first()
        
        return PrepaymentResponse.from_orm(prepayment)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update prepayment: {str(e)}"
        )


@router.patch("/{prepayment_id}/status", response_model=PrepaymentResponse)
async def update_prepayment_status(
    prepayment_id: int,
    status_data: PrepaymentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update prepayment status (for approvers/superusers)
    """
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Only approvers and superusers can change status
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to change status"
        )
    
    try:
        status_enum = RequestStatus(status_data.status)
        prepayment.status = status_enum
        prepayment.updated_at = datetime.utcnow()
        
        # Add comment if provided
        if status_data.comment:
            prepayment.comment = (prepayment.comment or "") + f"\n[{datetime.utcnow()}] Status changed to {status_data.status}: {status_data.comment}"
        
        db.commit()
        db.refresh(prepayment)
        
        # Load relationships for response
        prepayment = db.query(Prepayment).options(
            joinedload(Prepayment.destination_country),
            joinedload(Prepayment.requesting_user)
        ).filter(Prepayment.id == prepayment.id).first()
        
        return PrepaymentResponse.from_orm(prepayment)
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status_data.status}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update prepayment status: {str(e)}"
        )


@router.delete("/{prepayment_id}")
async def delete_prepayment(
    prepayment_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a prepayment (superuser only)
    """
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    try:
        db.delete(prepayment)
        db.commit()
        
        return {"message": "Prepayment deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete prepayment: {str(e)}"
        )