"""
Approval Schemas
Pydantic models for approval data validation and serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, Union
from datetime import datetime


class ApprovalBase(BaseModel):
    """Base approval schema"""
    entity_type: str = Field(..., description="Entity type (prepayment/travel_expense_report)")
    entity_id: int = Field(..., description="Entity ID")
    approver_user_id: int = Field(..., description="Approver user ID")
    approval_level: int = Field(..., description="Approval level")


class ApprovalCreate(ApprovalBase):
    """Schema for creating an approval"""
    pass


class ApprovalResponse(ApprovalBase):
    """Schema for approval response"""
    id: int
    status: str
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Related data
    approver_name: Optional[str] = None
    entity_details: Optional[dict] = None  # Dynamic details based on entity type

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj, entity_details=None):
        return cls(
            id=obj.id,
            entity_type=obj.entity_type.value if obj.entity_type else "prepayment",
            entity_id=obj.entity_id,
            approver_user_id=obj.approver_user_id,
            approval_level=obj.approval_level,
            status=obj.status.value if obj.status else "pending",
            rejection_reason=obj.rejection_reason,
            approved_at=obj.approved_at,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            approver_name=f"{obj.approver_user.name} {obj.approver_user.surname}" if obj.approver_user else None,
            entity_details=entity_details
        )


class ApprovalList(BaseModel):
    """Schema for approval list response"""
    approvals: list[ApprovalResponse]
    total: int
    skip: int
    limit: int


class ApprovalAction(BaseModel):
    """Schema for approval actions (approve/reject)"""
    action: str = Field(..., description="Action: 'approve' or 'reject'")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection (required if action is 'reject')")
    comments: Optional[str] = Field(None, description="Additional comments")


class PendingApprovalItem(BaseModel):
    """Schema for pending approval items (for frontend approvals page)"""
    id: int
    type: str  # "prepayment" or "report"
    entity_id: int
    requester: str
    amount: Optional[str] = None
    currency: Optional[str] = None
    reason: Optional[str] = None
    destination: Optional[str] = None
    request_date: str
    prepayment_id: Optional[int] = None  # For reports
    total_expenses: Optional[str] = None  # For reports
    prepaid_amount: Optional[str] = None  # For reports
    report_date: Optional[str] = None  # For reports


class PendingApprovalsList(BaseModel):
    """Schema for pending approvals list (formatted for frontend)"""
    items: list[PendingApprovalItem]
    total: int
