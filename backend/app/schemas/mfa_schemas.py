"""
MFA (Multi-Factor Authentication) Schemas
Pydantic models for MFA-related API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class MFASetupRequest(BaseModel):
    """Request to set up MFA for a user"""
    pass  # No input needed, just trigger setup


class MFASetupResponse(BaseModel):
    """Response with MFA setup data"""
    qr_code: str = Field(..., description="Base64 encoded QR code for authenticator app")
    secret: str = Field(..., description="Manual entry key for authenticator app")
    backup_codes: List[str] = Field(..., description="One-time backup codes for recovery")


class MFAVerifySetupRequest(BaseModel):
    """Request to verify and enable MFA setup"""
    token: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP token")
    secret: str = Field(..., description="The secret provided during setup")
    backup_codes: List[str] = Field(..., description="The backup codes provided during setup")


class MFAVerifyRequest(BaseModel):
    """Request to verify MFA during login"""
    mfa_token: str = Field(..., description="Temporary MFA token from login step 1")
    code: str = Field(..., min_length=6, max_length=8, description="6-digit TOTP or 8-character backup code")


class MFADisableRequest(BaseModel):
    """Request to disable MFA"""
    password: str = Field(..., description="User's current password for security")
    confirmation: bool = Field(..., description="Confirmation that user wants to disable MFA")


class MFAStatusResponse(BaseModel):
    """Response with user's MFA status"""
    enabled: bool = Field(..., description="Whether MFA is enabled")
    backup_codes_count: Optional[int] = Field(None, description="Number of remaining backup codes")
    last_used: Optional[str] = Field(None, description="Last time MFA was used (ISO format)")


class MFABackupCodesResponse(BaseModel):
    """Response with new backup codes"""
    backup_codes: List[str] = Field(..., description="New backup codes")
    message: str = Field(..., description="Important information about backup codes")


# Updated login-related schemas for MFA support
class MFALoginResponse(BaseModel):
    """Response from login when MFA is required"""
    requires_mfa: bool = Field(True, description="Indicates MFA verification is required")
    mfa_token: str = Field(..., description="Temporary token for MFA verification")
    message: str = Field(..., description="Instructions for next step")


class MFASetupRequiredResponse(BaseModel):
    """Response when user must set up MFA before proceeding"""
    requires_mfa_setup: bool = Field(True, description="Indicates MFA setup is required")
    setup_token: str = Field(..., description="Temporary token for MFA setup")
    message: str = Field(..., description="Instructions for MFA setup requirement")


class MFACompleteLoginResponse(BaseModel):
    """Response after successful MFA verification"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: dict = Field(..., description="User information")  # Will use existing UserInfo schema




