"""
Users Router
Handles user management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import User, Country
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.user_schemas import (
    UserCreate, UserUpdate, UserResponse, UserList
)
from app.schemas.password_schemas import (
    PasswordChangeRequest, AdminPasswordUpdateRequest, PasswordUpdateResponse
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=UserList)
async def get_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by name, surname, or email"),
    profile: Optional[str] = Query(None, description="Filter by user profile"),
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Get all users (superuser only)
    """
    query = db.query(User)
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_filter)) |
            (User.surname.ilike(search_filter)) |
            (User.email.ilike(search_filter))
        )
    
    # Apply profile filter
    if profile:
        query = query.filter(User.profile == profile)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.offset(skip).limit(limit).all()
    
    return UserList(
        users=[UserResponse.from_orm(user) for user in users],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Create a new user (superuser only)
    """
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if country exists
        country = db.query(Country).filter(Country.id == user_data.country_id).first()
        if not country:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid country ID"
            )
        
        # Check supervisor if provided
        if user_data.supervisor_id:
            supervisor = db.query(User).filter(User.id == user_data.supervisor_id).first()
            if not supervisor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid supervisor ID"
                )
        
        # Hash password
        hashed_password = auth_service.get_password_hash(user_data.password)
        
        # Create user
        db_user = User(
            email=user_data.email,
            name=user_data.name,
            surname=user_data.surname,
            password=hashed_password,
            sap_code=user_data.sap_code,
            country_id=user_data.country_id,
            cost_center=user_data.cost_center,
            credit_card_number=user_data.credit_card_number,
            supervisor_id=user_data.supervisor_id,
            profile=user_data.profile,
            is_superuser=user_data.is_superuser,
            is_approver=user_data.is_approver,
            force_password_change=user_data.force_password_change
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return UserResponse.from_orm(db_user)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific user
    """
    # Users can only view their own profile unless they are superuser
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user
    """
    # Users can only update their own profile unless they are superuser
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        # Update fields that are provided
        update_data = user_data.dict(exclude_unset=True)
        
        # Check email uniqueness if email is being updated
        if "email" in update_data and update_data["email"] != user.email:
            existing_user = db.query(User).filter(
                User.email == update_data["email"],
                User.id != user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        # Check country if being updated
        if "country_id" in update_data:
            country = db.query(Country).filter(Country.id == update_data["country_id"]).first()
            if not country:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid country ID"
                )
        
        # Check supervisor if being updated
        if "supervisor_id" in update_data and update_data["supervisor_id"]:
            if update_data["supervisor_id"] == user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User cannot be their own supervisor"
                )
            supervisor = db.query(User).filter(User.id == update_data["supervisor_id"]).first()
            if not supervisor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid supervisor ID"
                )
        
        # Update user
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return UserResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete a user (superuser only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user has associated transactions
    if user.prepayments or user.expense_reports:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete user with associated transactions"
        )
    
    try:
        db.delete(user)
        db.commit()
        return {"message": "User deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.post("/change-password", response_model=PasswordUpdateResponse)
async def change_own_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow users to change their own password
    """
    try:
        # Verify current password
        if not auth_service.verify_password(password_data.current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        new_password_hash = auth_service.get_password_hash(password_data.new_password)
        current_user.password = new_password_hash
        current_user.force_password_change = False  # Clear force change flag
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        return PasswordUpdateResponse(
            message="Password updated successfully",
            user_id=current_user.id,
            force_password_change=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}"
        )


@router.post("/admin/update-password", response_model=PasswordUpdateResponse)
async def admin_update_user_password(
    password_data: AdminPasswordUpdateRequest,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Allow superadmin to update any user's password
    """
    try:
        # Find the target user
        target_user = db.query(User).filter(User.id == password_data.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent superadmin from updating their own password through this endpoint
        if target_user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use the change-password endpoint to update your own password"
            )
        
        # Update password
        new_password_hash = auth_service.get_password_hash(password_data.new_password)
        target_user.password = new_password_hash
        target_user.force_password_change = password_data.force_password_change
        target_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        return PasswordUpdateResponse(
            message=f"Password updated successfully for user {target_user.name} {target_user.surname}",
            user_id=target_user.id,
            force_password_change=password_data.force_password_change
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user password: {str(e)}"
        )
