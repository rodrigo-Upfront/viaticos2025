"""
Authentication Router
Handles user login, logout, and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Union

from app.database.connection import get_db
from app.models.models import User
from app.core.config import settings
from app.services.auth_service import AuthService, get_current_user
from app.schemas.auth_schemas import (
    LoginRequest, LoginResponse, TokenResponse, 
    ChangePasswordRequest, UserInfo
)
from app.schemas.mfa_schemas import (
    MFALoginResponse, MFAVerifyRequest, MFACompleteLoginResponse, MFASetupRequiredResponse
)
from app.services.mfa_service import MFAService

router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()
mfa_service = MFAService()


@router.post("/login", response_model=Union[LoginResponse, MFALoginResponse, MFASetupRequiredResponse])
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    User login endpoint - Step 1: Email/Password validation
    Returns either final tokens (if MFA disabled) or MFA challenge (if MFA enabled)
    """
    try:
        # Authenticate user
        user = auth_service.authenticate_user(db, login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if MFA is required by admin but not yet set up
        if user.mfa_required_by_admin and not user.mfa_enabled:
            # User must set up MFA before proceeding
            setup_token = auth_service.create_setup_token(user.id)
            
            return MFASetupRequiredResponse(
                requires_mfa_setup=True,
                setup_token=setup_token,
                message="Your administrator has required you to set up Multi-Factor Authentication. You must complete MFA setup before you can access the system."
            )
        
        # Check if user has MFA enabled
        if user.mfa_enabled and user.mfa_secret:
            # Create temporary MFA token for verification
            mfa_token = auth_service.create_mfa_token(user.id)
            
            return MFALoginResponse(
                requires_mfa=True,
                mfa_token=mfa_token,
                message="Please enter your authenticator code or backup code to complete login"
            )
        
        # No MFA required - proceed with normal login
        access_token = auth_service.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        refresh_token = auth_service.create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserInfo(
                id=user.id,
                email=user.email,
                name=user.name,
                surname=user.surname,
                profile=user.profile,
                is_superuser=user.is_superuser,
                is_approver=user.is_approver,
                force_password_change=user.force_password_change
            )
        )
        
    except HTTPException:
        # Re-raise HTTPExceptions (like invalid credentials) without modification
        raise
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/mfa/verify", response_model=MFACompleteLoginResponse)
async def verify_mfa(
    mfa_data: MFAVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    MFA verification endpoint - Step 2: Verify TOTP/backup code
    """
    try:
        # Verify MFA token
        payload = auth_service.verify_mfa_token(mfa_data.mfa_token)
        user_id = int(payload.get("sub"))
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user"
            )
        
        # Verify MFA code
        if not mfa_service.verify_user_mfa(db, user_id, mfa_data.code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification code"
            )
        
        # MFA verified successfully - generate final tokens
        access_token = auth_service.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        refresh_token = auth_service.create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        return MFACompleteLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "surname": user.surname,
                "profile": user.profile,
                "is_superuser": user.is_superuser,
                "is_approver": user.is_approver,
                "force_password_change": user.force_password_change
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"MFA verification error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MFA verification failed: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    try:
        # Verify refresh token
        payload = auth_service.verify_refresh_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Generate new access token
        access_token = auth_service.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    """
    try:
        # Verify current password
        if not auth_service.verify_password(password_data.current_password, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        hashed_password = auth_service.get_password_hash(password_data.new_password)
        current_user.password = hashed_password
        current_user.force_password_change = False
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    """
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        surname=current_user.surname,
        profile=current_user.profile,
        is_superuser=current_user.is_superuser,
        is_approver=current_user.is_approver,
        force_password_change=current_user.force_password_change
    )


@router.post("/logout")
async def logout():
    """
    User logout endpoint
    Note: In a stateless JWT system, logout is handled on the client side
    """
    return {"message": "Logged out successfully"}
