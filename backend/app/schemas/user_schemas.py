"""
User Schemas
Pydantic models for user-related requests and responses
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime

from app.models.models import UserProfile


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr = Field(..., description="User email address")
    name: str = Field(..., min_length=1, max_length=100, description="User first name")
    surname: str = Field(..., min_length=1, max_length=100, description="User surname")
    sap_code: str = Field(..., min_length=1, max_length=50, description="SAP code")
    country_id: int = Field(..., description="Country ID")
    cost_center: str = Field(..., min_length=1, max_length=100, description="Cost center")
    credit_card_number: Optional[str] = Field(None, max_length=20, description="Credit card number")
    supervisor_id: Optional[int] = Field(None, description="Supervisor user ID")
    profile: UserProfile = Field(..., description="User profile/role")
    is_superuser: bool = Field(default=False, description="Superuser flag")
    is_approver: bool = Field(default=False, description="Approver flag")


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8, description="User password (minimum 8 characters)")
    force_password_change: bool = Field(default=True, description="Force password change flag")
    
    @validator('supervisor_id')
    def validate_supervisor_not_self(cls, v, values):
        """Ensure user is not their own supervisor"""
        # This will be validated in the API layer where we have access to the user ID
        return v


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = Field(None, description="User email address")
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="User first name")
    surname: Optional[str] = Field(None, min_length=1, max_length=100, description="User surname")
    sap_code: Optional[str] = Field(None, min_length=1, max_length=50, description="SAP code")
    country_id: Optional[int] = Field(None, description="Country ID")
    cost_center: Optional[str] = Field(None, min_length=1, max_length=100, description="Cost center")
    credit_card_number: Optional[str] = Field(None, max_length=20, description="Credit card number")
    supervisor_id: Optional[int] = Field(None, description="Supervisor user ID")
    profile: Optional[UserProfile] = Field(None, description="User profile/role")
    is_superuser: Optional[bool] = Field(None, description="Superuser flag")
    is_approver: Optional[bool] = Field(None, description="Approver flag")
    force_password_change: Optional[bool] = Field(None, description="Force password change flag")


class UserResponse(BaseModel):
    """User response schema"""
    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    name: str = Field(..., description="User first name")
    surname: str = Field(..., description="User surname")
    sap_code: str = Field(..., description="SAP code")
    country_id: int = Field(..., description="Country ID")
    cost_center: str = Field(..., description="Cost center")
    credit_card_number: Optional[str] = Field(None, description="Credit card number")
    supervisor_id: Optional[int] = Field(None, description="Supervisor user ID")
    profile: UserProfile = Field(..., description="User profile/role")
    is_superuser: bool = Field(..., description="Superuser flag")
    is_approver: bool = Field(..., description="Approver flag")
    force_password_change: bool = Field(..., description="Force password change flag")
    mfa_enabled: bool = Field(default=False, description="MFA enabled flag")
    mfa_required_by_admin: bool = Field(default=False, description="MFA required by admin flag")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    # Related data
    country_name: Optional[str] = Field(None, description="Country name")
    supervisor_name: Optional[str] = Field(None, description="Supervisor full name")
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, user):
        """Create UserResponse from ORM model"""
        data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "surname": user.surname,
            "sap_code": user.sap_code,
            "country_id": user.country_id,
            "cost_center": user.cost_center,
            "credit_card_number": user.credit_card_number,
            "supervisor_id": user.supervisor_id,
            "profile": user.profile,
            "is_superuser": user.is_superuser,
            "is_approver": user.is_approver,
            "force_password_change": user.force_password_change,
            "mfa_enabled": user.mfa_enabled,
            "mfa_required_by_admin": user.mfa_required_by_admin,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
        
        # Add related data if available
        if hasattr(user, 'country') and user.country:
            data["country_name"] = user.country.name
        
        if hasattr(user, 'supervisor') and user.supervisor:
            data["supervisor_name"] = f"{user.supervisor.name} {user.supervisor.surname}"
        
        return cls(**data)


class UserList(BaseModel):
    """User list response schema"""
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    skip: int = Field(..., description="Number of skipped records")
    limit: int = Field(..., description="Number of records returned")


class UserSummary(BaseModel):
    """User summary schema for dropdowns"""
    id: int = Field(..., description="User ID")
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    profile: UserProfile = Field(..., description="User profile")
    
    @classmethod
    def from_orm(cls, user):
        """Create UserSummary from ORM model"""
        return cls(
            id=user.id,
            name=f"{user.name} {user.surname}",
            email=user.email,
            profile=user.profile
        )

