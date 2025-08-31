"""
Password Management Schemas
Pydantic models for password update operations
"""

from pydantic import BaseModel, Field, validator
import re


class PasswordChangeRequest(BaseModel):
    """Schema for user changing their own password"""
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
    confirm_password: str = Field(..., description="Confirmation of new password")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one number and one letter
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Ensure password confirmation matches"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Password confirmation does not match')
        return v


class AdminPasswordUpdateRequest(BaseModel):
    """Schema for superadmin updating another user's password"""
    user_id: int = Field(..., description="ID of the user whose password to update")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
    force_password_change: bool = Field(False, description="Force user to change password on next login")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one number and one letter
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        
        return v


class PasswordUpdateResponse(BaseModel):
    """Schema for password update response"""
    message: str = Field(..., description="Success message")
    user_id: int = Field(..., description="ID of the user whose password was updated")
    force_password_change: bool = Field(..., description="Whether user must change password on next login")
