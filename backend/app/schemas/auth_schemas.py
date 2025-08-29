"""
Authentication Schemas
Pydantic models for authentication requests and responses
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.models import UserProfile


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class LoginResponse(TokenResponse):
    """Login response schema"""
    refresh_token: str = Field(..., description="JWT refresh token")
    user: "UserInfo" = Field(..., description="User information")


class ChangePasswordRequest(BaseModel):
    """Change password request schema"""
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")
    
    def validate_passwords_match(cls, v, values):
        """Validate that new password and confirmation match"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UserInfo(BaseModel):
    """User information schema"""
    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User first name")
    surname: str = Field(..., description="User last name")
    profile: UserProfile = Field(..., description="User profile/role")
    is_superuser: bool = Field(..., description="Superuser flag")
    is_approver: bool = Field(..., description="Approver flag")
    force_password_change: bool = Field(..., description="Force password change flag")
    
    class Config:
        from_attributes = True


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str = Field(..., description="Refresh token")


# Update forward references
LoginResponse.model_rebuild()

