"""
MFA (Multi-Factor Authentication) Router
Handles MFA setup, management, and verification
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.models import User
from app.services.auth_service import get_current_user, AuthService
from app.services.mfa_service import MFAService
from app.schemas.mfa_schemas import (
    MFASetupRequest, MFASetupResponse, MFAVerifySetupRequest,
    MFADisableRequest, MFAStatusResponse, MFABackupCodesResponse
)

router = APIRouter()
mfa_service = MFAService()
auth_service = AuthService()


@router.get("/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's MFA status"""
    backup_codes_count = None
    last_used = None
    
    if current_user.mfa_enabled and current_user.backup_codes:
        backup_codes_count = len(current_user.backup_codes)
    
    if current_user.mfa_last_used:
        last_used = current_user.mfa_last_used.isoformat()
    
    return MFAStatusResponse(
        enabled=current_user.mfa_enabled,
        backup_codes_count=backup_codes_count,
        last_used=last_used
    )


@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(
    setup_request: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize MFA setup for the current user"""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this user"
        )
    
    try:
        secret, qr_code, backup_codes = mfa_service.setup_mfa(db, current_user.id)
        
        return MFASetupResponse(
            qr_code=qr_code,
            secret=secret,
            backup_codes=backup_codes
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup MFA: {str(e)}"
        )


@router.post("/verify-setup")
async def verify_mfa_setup(
    verify_request: MFAVerifySetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and enable MFA setup"""
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled for this user"
        )
    
    # Verify the TOTP token
    if not mfa_service.verify_totp(verify_request.secret, verify_request.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Enable MFA
    success = mfa_service.enable_mfa(
        db, 
        current_user.id, 
        verify_request.secret, 
        verify_request.backup_codes
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable MFA"
        )
    
    return {"message": "MFA has been successfully enabled"}


@router.post("/disable")
async def disable_mfa(
    disable_request: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable MFA for the current user"""
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user"
        )
    
    # Verify user's password for security
    if not auth_service.verify_password(disable_request.password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    if not disable_request.confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to disable MFA"
        )
    
    # Disable MFA
    success = mfa_service.disable_mfa(db, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable MFA"
        )
    
    return {"message": "MFA has been successfully disabled"}


@router.post("/regenerate-backup-codes", response_model=MFABackupCodesResponse)
async def regenerate_backup_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Regenerate backup codes for the current user"""
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user"
        )
    
    new_codes = mfa_service.regenerate_backup_codes(db, current_user.id)
    
    if not new_codes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate backup codes"
        )
    
    return MFABackupCodesResponse(
        backup_codes=new_codes,
        message="New backup codes generated. Store them securely - they will not be shown again!"
    )


@router.post("/test-code")
async def test_mfa_code(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test an MFA code without consuming it (for setup verification)"""
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user"
        )
    
    try:
        # Decrypt secret and test TOTP
        secret = mfa_service.decrypt_secret(current_user.mfa_secret)
        is_valid = mfa_service.verify_totp(secret, code)
        
        return {"valid": is_valid}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test code: {str(e)}"
        )




