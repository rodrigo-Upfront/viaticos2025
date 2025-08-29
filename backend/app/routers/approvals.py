"""
Approvals Router
Handles approval workflow operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.models import (
    User, Approval, Prepayment, TravelExpenseReport, Country,
    ApprovalStatus, EntityType, RequestStatus
)
from app.services.auth_service import AuthService, get_current_user, get_current_approver
from app.schemas.approval_schemas import (
    ApprovalCreate, ApprovalResponse, ApprovalList, 
    ApprovalAction, PendingApprovalItem, PendingApprovalsList
)

router = APIRouter()
auth_service = AuthService()


@router.get("/pending", response_model=PendingApprovalsList)
async def get_pending_approvals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all pending approvals for the current approver
    Returns a simplified format for the frontend approvals page
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view pending approvals"
        )
    
    try:
        pending_items = []
        item_counter = 0
        
        # Get pending prepayments
        pending_prepayments = db.query(Prepayment).options(
            joinedload(Prepayment.destination_country),
            joinedload(Prepayment.requesting_user)
        ).filter(Prepayment.status == RequestStatus.PENDING).all()
        
        for prepayment in pending_prepayments:
            item_counter += 1
            pending_items.append(PendingApprovalItem(
                id=item_counter,
                type="prepayment",
                entity_id=prepayment.id,
                requester=f"{prepayment.requesting_user.name} {prepayment.requesting_user.surname}" if prepayment.requesting_user else "Unknown",
                amount=str(prepayment.amount) if prepayment.amount else "0",
                currency=prepayment.currency or "USD",
                reason=prepayment.reason or "No reason provided",
                destination=prepayment.destination_country.name if prepayment.destination_country else "Unknown",
                request_date=prepayment.created_at.strftime("%Y-%m-%d") if prepayment.created_at else "Unknown"
            ))
        
        # Get pending expense reports
        pending_reports = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
            joinedload(TravelExpenseReport.requesting_user),
            joinedload(TravelExpenseReport.expenses)
        ).filter(TravelExpenseReport.status == RequestStatus.PENDING).all()
        
        for report in pending_reports:
            item_counter += 1
            total_expenses = sum(expense.amount for expense in report.expenses) if report.expenses else 0
            prepaid_amount = float(report.prepayment.amount) if report.prepayment and report.prepayment.amount else 0
            
            pending_items.append(PendingApprovalItem(
                id=item_counter,
                type="report",
                entity_id=report.id,
                requester=f"{report.requesting_user.name} {report.requesting_user.surname}" if report.requesting_user else "Unknown",
                request_date=report.created_at.strftime("%Y-%m-%d") if report.created_at else "Unknown",
                prepayment_id=report.prepayment_id if report.prepayment_id else 0,
                total_expenses=str(float(total_expenses)),
                prepaid_amount=str(prepaid_amount),
                report_date=report.created_at.strftime("%Y-%m-%d") if report.created_at else "Unknown",
                amount=str(float(total_expenses)),  # Use total expenses as the approval amount
                currency=report.prepayment.currency if report.prepayment else "USD"
            ))
        
        return PendingApprovalsList(
            items=pending_items,
            total=len(pending_items)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving pending approvals: {str(e)}"
        )


@router.post("/prepayments/{prepayment_id}/approve")
async def approve_prepayment(
    prepayment_id: int,
    action_data: ApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a prepayment
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to approve/reject prepayments"
        )
    
    prepayment = db.query(Prepayment).filter(Prepayment.id == prepayment_id).first()
    
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    if prepayment.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prepayment is not pending approval"
        )
    
    # Validate action
    if action_data.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    if action_data.action == "reject" and not action_data.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required when rejecting"
        )
    
    try:
        # Update prepayment status
        if action_data.action == "approve":
            prepayment.status = RequestStatus.APPROVED
        else:
            prepayment.status = RequestStatus.REJECTED
            if action_data.rejection_reason:
                prepayment.comment = (prepayment.comment or "") + f"\n[REJECTED] {action_data.rejection_reason}"
        
        prepayment.updated_at = datetime.utcnow()
        
        # Create approval record
        approval = Approval(
            entity_type=EntityType.PREPAYMENT,
            entity_id=prepayment_id,
            approver_user_id=current_user.id,
            status=ApprovalStatus.APPROVED if action_data.action == "approve" else ApprovalStatus.REJECTED,
            approval_level=1,
            rejection_reason=action_data.rejection_reason,
            approved_at=datetime.utcnow() if action_data.action == "approve" else None
        )
        
        db.add(approval)
        db.commit()
        
        return {
            "message": f"Prepayment {action_data.action}d successfully",
            "prepayment_id": prepayment_id,
            "new_status": prepayment.status.value
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to {action_data.action} prepayment: {str(e)}"
        )


@router.post("/reports/{report_id}/approve")
async def approve_expense_report(
    report_id: int,
    action_data: ApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject an expense report
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to approve/reject expense reports"
        )
    
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    if report.status != RequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense report is not pending approval"
        )
    
    # Validate action
    if action_data.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    if action_data.action == "reject" and not action_data.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required when rejecting"
        )
    
    try:
        # Update report status
        if action_data.action == "approve":
            report.status = RequestStatus.APPROVED
        else:
            report.status = RequestStatus.REJECTED
        
        report.updated_at = datetime.utcnow()
        
        # Create approval record
        approval = Approval(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report_id,
            approver_user_id=current_user.id,
            status=ApprovalStatus.APPROVED if action_data.action == "approve" else ApprovalStatus.REJECTED,
            approval_level=1,
            rejection_reason=action_data.rejection_reason,
            approved_at=datetime.utcnow() if action_data.action == "approve" else None
        )
        
        db.add(approval)
        db.commit()
        
        return {
            "message": f"Expense report {action_data.action}d successfully",
            "report_id": report_id,
            "new_status": report.status.value
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to {action_data.action} expense report: {str(e)}"
        )


@router.get("/", response_model=ApprovalList)
async def get_approvals(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get approval history (for audit/reporting)
    """
    query = db.query(Approval).options(joinedload(Approval.approver_user))
    
    # Non-superusers can only see their own approvals
    if not current_user.is_superuser:
        query = query.filter(Approval.approver_user_id == current_user.id)
    
    # Apply filters
    if entity_type:
        try:
            entity_enum = EntityType(entity_type)
            query = query.filter(Approval.entity_type == entity_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity type: {entity_type}"
            )
    
    if status_filter:
        try:
            status_enum = ApprovalStatus(status_filter)
            query = query.filter(Approval.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    approvals = query.order_by(Approval.created_at.desc()).offset(skip).limit(limit).all()
    
    return ApprovalList(
        approvals=[ApprovalResponse.from_orm(approval) for approval in approvals],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(
    approval_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific approval by ID
    """
    approval = db.query(Approval).options(
        joinedload(Approval.approver_user)
    ).filter(Approval.id == approval_id).first()
    
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found"
        )
    
    # Non-superusers can only access their own approvals
    if not current_user.is_superuser and approval.approver_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return ApprovalResponse.from_orm(approval)


