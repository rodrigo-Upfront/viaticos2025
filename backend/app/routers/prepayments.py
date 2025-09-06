"""
Prepayments Router
Handles prepayment management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil

from app.database.connection import get_db
from app.models.models import User, Prepayment, Country, Currency, RequestStatus, UserProfile
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
    country_id: Optional[int] = Query(None, description="Filter by destination country id"),
    user_id: Optional[int] = Query(None, description="Filter by user ID (accounting/treasury only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all prepayments for the current user (or all if superuser)
    """
    query = db.query(Prepayment).options(
        joinedload(Prepayment.destination_country),
        joinedload(Prepayment.requesting_user),
        joinedload(Prepayment.currency)
    )
    
    # Permission-based filtering
    if not current_user.is_superuser:
        if user_id and current_user.profile in [UserProfile.ACCOUNTING, UserProfile.TREASURY]:
            # Accounting/Treasury can view any user's records when user_id is specified
            query = query.filter(Prepayment.requesting_user_id == user_id)
        elif user_id and current_user.profile not in [UserProfile.ACCOUNTING, UserProfile.TREASURY]:
            # Regular users cannot filter by other users - return 403
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to filter by user"
            )
        else:
            # Default: users see only their own prepayments
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
            status_enum = RequestStatus(status_filter.upper())
            query = query.filter(Prepayment.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    # Apply country filter
    if country_id:
        query = query.filter(Prepayment.destination_country_id == country_id)
    
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


@router.get("/filter-options")
async def get_prepayment_filter_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get distinct filter options for prepayments based on user's visible data
    """
    query = db.query(Prepayment).options(
        joinedload(Prepayment.destination_country),
        joinedload(Prepayment.currency)
    )
    
    # Non-superusers can only see their own prepayments + those they can approve
    if not current_user.is_superuser:
        # User's own prepayments OR prepayments they can approve
        user_filter = Prepayment.requesting_user_id == current_user.id
        
        # Add approval permissions if user is an approver
        if current_user.is_approver:
            if current_user.profile == UserProfile.MANAGER:
                # Managers can approve their subordinates' prepayments
                subordinate_ids = db.query(User.id).filter(User.supervisor_id == current_user.id).subquery()
                user_filter = user_filter | Prepayment.requesting_user_id.in_(subordinate_ids)
            elif current_user.profile == UserProfile.ACCOUNTING:
                # Accounting can see prepayments in accounting approval stage
                user_filter = user_filter | (Prepayment.status == RequestStatus.ACCOUNTING_PENDING)
            elif current_user.profile == UserProfile.TREASURY:
                # Treasury can see prepayments in treasury approval stage
                user_filter = user_filter | (Prepayment.status == RequestStatus.TREASURY_PENDING)
        
        query = query.filter(user_filter)
    
    prepayments = query.all()
    
    # Extract distinct values
    distinct_statuses = list(set(p.status.value for p in prepayments if p.status))
    
    # Use tuples for hashable sets, then convert back to dicts
    country_tuples = set((p.destination_country.id, p.destination_country.name) for p in prepayments if p.destination_country)
    distinct_countries = [{'id': country_id, 'name': country_name} for country_id, country_name in country_tuples]
    
    currency_tuples = set((p.currency.id, p.currency.code, p.currency.name) for p in prepayments if p.currency)
    distinct_currencies = [{'id': curr_id, 'code': curr_code, 'name': curr_name} for curr_id, curr_code, curr_name in currency_tuples]
    
    # Sort lists
    distinct_countries = sorted(distinct_countries, key=lambda x: x['name'])
    distinct_currencies = sorted(distinct_currencies, key=lambda x: x['code'])
    
    return {
        "statuses": sorted(distinct_statuses),
        "countries": distinct_countries,
        "currencies": distinct_currencies
    }


@router.get("/users-for-filter")
async def get_users_for_filter(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users for filtering (accounting/treasury only)
    """
    # Only accounting and treasury users can access this endpoint
    if current_user.profile not in [UserProfile.ACCOUNTING, UserProfile.TREASURY] and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access user list"
        )
    
    # Get all users (excluding superusers for cleaner list)
    users = db.query(User).filter(User.is_superuser == False).order_by(User.name, User.surname).all()
    
    return [
        {
            "id": user.id,
            "name": f"{user.name} {user.surname}",
            "email": user.email,
            "profile": user.profile.value
        }
        for user in users
    ]


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
        joinedload(Prepayment.requesting_user),
        joinedload(Prepayment.currency)
    ).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Check permissions - allow access to:
    # 1. Superusers
    # 2. The prepayment requester
    # 3. Managers who can approve (their subordinates' prepayments)
    # 4. Accounting/Treasury users (for approval workflow)
    has_permission = (
        current_user.is_superuser or 
        prepayment.requesting_user_id == current_user.id
    )
    
    # If not owner/superuser, check if user has approval permissions
    if not has_permission and current_user.is_approver:
        if current_user.profile == UserProfile.MANAGER:
            # Managers can view their subordinates' prepayments
            subordinate = db.query(User).filter(
                User.id == prepayment.requesting_user_id,
                User.supervisor_id == current_user.id
            ).first()
            has_permission = subordinate is not None
        elif current_user.profile in [UserProfile.ACCOUNTING, UserProfile.TREASURY]:
            # Accounting and treasury can view prepayments in their approval stages
            has_permission = True
    
    if not has_permission:
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
    
    # Verify currency exists
    currency = db.query(Currency).filter(Currency.id == prepayment_data.currency_id).first()
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found"
        )
    
    # Validate date range
    if prepayment_data.start_date > prepayment_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be on or after start date"
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
            joinedload(Prepayment.requesting_user),
            joinedload(Prepayment.currency)
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
    
    # Non-superusers can only update their own prepayments and only if pending or rejected
    if not current_user.is_superuser:
        if prepayment.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        if prepayment.status not in [RequestStatus.PENDING, RequestStatus.REJECTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only edit pending or rejected prepayments"
            )
    
    # Verify destination country exists if being updated
    if prepayment_data.destination_country_id:
        country = db.query(Country).filter(Country.id == prepayment_data.destination_country_id).first()
        if not country:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination country not found"
            )
    
    # Verify currency exists if being updated
    if prepayment_data.currency_id:
        currency = db.query(Currency).filter(Currency.id == prepayment_data.currency_id).first()
        if not currency:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Currency not found"
            )
    
    # Validate date range if dates are being updated
    start_date = prepayment_data.start_date or prepayment.start_date
    end_date = prepayment_data.end_date or prepayment.end_date
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be on or after start date"
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
            joinedload(Prepayment.requesting_user),
            joinedload(Prepayment.currency)
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
        status_enum = RequestStatus(status_data.status.upper())
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
            joinedload(Prepayment.requesting_user),
            joinedload(Prepayment.currency)
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
    current_user: User = Depends(get_current_user),
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
    
    # Only superuser or owner can delete, and only if pending or rejected
    if not (current_user.is_superuser or prepayment.requesting_user_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    if prepayment.status not in [RequestStatus.PENDING, RequestStatus.REJECTED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete pending or rejected prepayments")

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


@router.get("/{prepayment_id}/download/{file_name}")
async def download_prepayment_file(
    prepayment_id: int,
    file_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a prepayment justification file"""
    
    # Get the prepayment
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Check permissions - users can download their own files, or supervisors/admin can download any
    if not (current_user.is_superuser or 
            prepayment.requesting_user_id == current_user.id or
            current_user.profile.value in ['manager', 'accounting', 'treasury']):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to download this file"
        )
    
    # Verify the file matches the prepayment's justification file
    if prepayment.justification_file != file_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found for this prepayment"
        )
    
    # Construct file path (assuming files are stored in storage/uploads/prepayments/)
    file_path = os.path.join("storage", "uploads", "prepayments", file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type='application/octet-stream'
    )


@router.post("/{prepayment_id}/upload-file")
async def upload_prepayment_file(
    prepayment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a justification file for a prepayment"""
    
    # Get the prepayment
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Check permissions - users can only upload files for their own prepayments, or admin can upload any
    if not (current_user.is_superuser or prepayment.requesting_user_id == current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to upload file for this prepayment"
        )
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'}
    file_extension = os.path.splitext(file.filename or '')[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size too large. Maximum size is 10MB"
        )
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = "storage/uploads/prepayments"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Update prepayment with new file
        prepayment.justification_file = unique_filename
        prepayment.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "File uploaded successfully",
            "filename": unique_filename,
            "original_filename": file.filename
        }
        
    except Exception as e:
        # Clean up file if database update fails
        if os.path.exists(file_path):
            os.remove(file_path)
        
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

