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
    ApprovalStatus, EntityType, RequestStatus, UserProfile, ApprovalHistory, ApprovalAction as HistoryAction
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
        
        # Get prepayments that are pending for this approver based on stage
        prepayment_query = db.query(Prepayment).options(
            joinedload(Prepayment.destination_country),
            joinedload(Prepayment.requesting_user),
            joinedload(Prepayment.currency)
        )

        stage_filters = []
        if current_user.is_approver or current_user.is_superuser:
            # Supervisor stage: only the requester's supervisor
            stage_filters.append(
                (Prepayment.status == RequestStatus.SUPERVISOR_PENDING) &
                (Prepayment.requesting_user_id == User.id)
            )

        # Fetch and filter in Python for clarity of role logic
        all_stage_prepayments = prepayment_query.filter(
            Prepayment.status.in_([
                RequestStatus.SUPERVISOR_PENDING.value,
                RequestStatus.ACCOUNTING_PENDING.value,
                RequestStatus.TREASURY_PENDING.value
            ])
        ).all()

        pending_prepayments = []
        for prepayment in all_stage_prepayments:
            requester = prepayment.requesting_user
            if prepayment.status == RequestStatus.SUPERVISOR_PENDING:
                if requester and requester.supervisor_id == current_user.id and current_user.is_approver:
                    pending_prepayments.append(prepayment)
            elif prepayment.status == RequestStatus.ACCOUNTING_PENDING:
                if current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING:
                    pending_prepayments.append(prepayment)
            elif prepayment.status == RequestStatus.TREASURY_PENDING:
                if current_user.is_approver and current_user.profile == UserProfile.TREASURY:
                    pending_prepayments.append(prepayment)
        
        for prepayment in pending_prepayments:
            item_counter += 1
            pending_items.append(PendingApprovalItem(
                id=item_counter,
                type="prepayment",
                entity_id=prepayment.id,
                requester=f"{prepayment.requesting_user.name} {prepayment.requesting_user.surname}" if prepayment.requesting_user else "Unknown",
                amount=str(prepayment.amount) if prepayment.amount else "0",
                currency=(prepayment.currency.code if getattr(prepayment, 'currency', None) else "USD"),
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
                currency=(report.prepayment.currency.code if report.prepayment and report.prepayment.currency else "USD")
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


@router.post("/prepayments/{prepayment_id}/submit")
async def submit_prepayment(
    prepayment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a prepayment into the multi-stage approval workflow.
    Allowed when status is PENDING or REJECTED.
    Validations:
    - Requester must have a supervisor
    - Supervisor must be an approver
    """
    prepayment = db.query(Prepayment).options(
        joinedload(Prepayment.requesting_user)
    ).filter(Prepayment.id == prepayment_id).first()

    if not prepayment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prepayment not found")

    # Only owner or superuser can submit
    if not current_user.is_superuser and prepayment.requesting_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to submit")

    if prepayment.status not in [RequestStatus.PENDING, RequestStatus.REJECTED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prepayment cannot be submitted in its current status")

    requester = prepayment.requesting_user
    if not requester or requester.supervisor_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing supervisor")

    supervisor = db.query(User).filter(User.id == requester.supervisor_id).first()
    if not supervisor or not supervisor.is_approver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supervisor do not have approval permits")

    try:
        prepayment.status = RequestStatus.SUPERVISOR_PENDING
        prepayment.updated_at = datetime.utcnow()

        # History
        db.add(ApprovalHistory(
            entity_type=EntityType.PREPAYMENT,
            entity_id=prepayment.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "employee",
            action=HistoryAction.SUBMITTED,
            from_status=RequestStatus.PENDING.value,
            to_status=RequestStatus.SUPERVISOR_PENDING.value,
            comments="Submitted for approval"
        ))

        db.commit()
        return {"message": "Prepayment submitted for supervisor approval", "new_status": prepayment.status.value}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to submit prepayment: {str(e)}")


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
    
    if prepayment.status == RequestStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prepayment already approved")
    
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
        requester = db.query(User).filter(User.id == prepayment.requesting_user_id).first()
        next_status = None
        message = None

        # Determine stage and permissions
        if prepayment.status == RequestStatus.SUPERVISOR_PENDING:
            if not (requester and requester.supervisor_id == current_user.id and current_user.is_approver):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for supervisor stage")
            if action_data.action == "approve":
                # Check accounting approvers exist
                has_accounting = db.query(User).filter(
                    User.profile == UserProfile.ACCOUNTING,
                    User.is_approver == True
                ).count() > 0
                if not has_accounting:
                    prepayment.status = RequestStatus.PENDING
                    prepayment.updated_at = datetime.utcnow()
                    prepayment.comment = (prepayment.comment or "") + "\nerrors on approval - missing accounting user"
                    db.commit()
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error - no accountants users available")
                next_status = RequestStatus.ACCOUNTING_PENDING
                message = "Prepayment approved by supervisor; pending accounting approval"
            else:
                next_status = RequestStatus.REJECTED
                message = "Prepayment rejected at supervisor stage"

        elif prepayment.status == RequestStatus.ACCOUNTING_PENDING:
            if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for accounting stage")
            if action_data.action == "approve":
                # Check treasury approvers exist
                has_treasury = db.query(User).filter(
                    User.profile == UserProfile.TREASURY,
                    User.is_approver == True
                ).count() > 0
                if not has_treasury:
                    prepayment.status = RequestStatus.PENDING
                    prepayment.updated_at = datetime.utcnow()
                    prepayment.comment = (prepayment.comment or "") + "\nerrors on approval - missing treasury user"
                    db.commit()
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error - no treasury users available")
                next_status = RequestStatus.TREASURY_PENDING
                message = "Prepayment approved by accounting; pending treasury approval"
            else:
                next_status = RequestStatus.REJECTED
                message = "Prepayment rejected at accounting stage"

        elif prepayment.status == RequestStatus.TREASURY_PENDING:
            if not (current_user.is_approver and current_user.profile == UserProfile.TREASURY):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for treasury stage")
            if action_data.action == "approve":
                next_status = RequestStatus.APPROVED
                message = "Prepayment approved by treasury"
            else:
                next_status = RequestStatus.REJECTED
                message = "Prepayment rejected at treasury stage"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prepayment is not in an approval stage")

        # Apply status
        prepayment.status = next_status
        prepayment.updated_at = datetime.utcnow()
        if action_data.action == "reject" and action_data.rejection_reason:
            prepayment.comment = (prepayment.comment or "") + f"\n[REJECTED] {action_data.rejection_reason}"

        # Approval record
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

        # History
        db.add(ApprovalHistory(
            entity_type=EntityType.PREPAYMENT,
            entity_id=prepayment.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "employee",
            action=HistoryAction.APPROVED if action_data.action == "approve" else HistoryAction.REJECTED,
            from_status=prepayment.status.value if prepayment.status else "",
            to_status=next_status.value,
            comments=action_data.rejection_reason or action_data.comments
        ))

        # On final approval, auto-create travel expense report if not exists
        created_report_id = None
        if next_status == RequestStatus.APPROVED:
            existing_report = db.query(TravelExpenseReport).filter(TravelExpenseReport.prepayment_id == prepayment.id).first()
            if not existing_report:
                report = TravelExpenseReport(
                    prepayment_id=prepayment.id,
                    status=RequestStatus.PENDING,
                    requesting_user_id=prepayment.requesting_user_id
                )
                db.add(report)
                db.flush()  # get id
                created_report_id = report.id

        db.commit()

        response = {
            "message": message,
            "prepayment_id": prepayment_id,
            "new_status": prepayment.status.value
        }
        if created_report_id:
            response["created_report_id"] = created_report_id
        return response

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to {action_data.action} prepayment: {str(e)}")


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


