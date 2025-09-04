"""
Approvals Router
Handles approval workflow operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
import os
import json
import uuid

from app.database.connection import get_db
from app.models.models import (
    User, Approval, Prepayment, TravelExpenseReport, Country, Expense, ExpenseStatus,
    ApprovalStatus, EntityType, RequestStatus, UserProfile, ApprovalHistory, ApprovalAction as HistoryAction,
    ExpenseRejectionHistory
)
from app.services.auth_service import AuthService, get_current_user, get_current_approver
from app.schemas.approval_schemas import (
    ApprovalCreate, ApprovalResponse, ApprovalList, 
    ApprovalAction, PendingApprovalItem, PendingApprovalsList,
    ReportApprovalAction, ReportApprovalResponse, ExpenseRejection,
    QuickApprovalAction, ExpenseApprovalAction
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
                RequestStatus.SUPERVISOR_PENDING,
                RequestStatus.ACCOUNTING_PENDING,
                RequestStatus.TREASURY_PENDING
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
                request_date=prepayment.created_at.strftime("%Y-%m-%d") if prepayment.created_at else "Unknown",
                status=prepayment.status.value if prepayment.status else "PENDING"
            ))
        
        # Get expense reports that are in approval stages with role-based filtering
        report_query = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.prepayment),
            joinedload(TravelExpenseReport.requesting_user),
            joinedload(TravelExpenseReport.expenses),
            joinedload(TravelExpenseReport.country),  # For reimbursement reports
            joinedload(TravelExpenseReport.currency)   # For currency info
        )

        # Apply role-based filtering for expense reports
        report_stage_filters = []
        if current_user.is_approver or current_user.is_superuser:
            # Supervisor stage: only reports where current user is the requester's supervisor
            if current_user.profile == UserProfile.MANAGER or current_user.is_superuser:
                report_stage_filters.append(
                    and_(
                        TravelExpenseReport.status == RequestStatus.SUPERVISOR_PENDING,
                        TravelExpenseReport.requesting_user.has(User.supervisor_id == current_user.id)
                    )
                )
            
            # Accounting stage: only accounting users
            if current_user.profile == UserProfile.ACCOUNTING or current_user.is_superuser:
                report_stage_filters.append(TravelExpenseReport.status == RequestStatus.ACCOUNTING_PENDING)
            
            # Treasury stage: only treasury users
            if current_user.profile == UserProfile.TREASURY or current_user.is_superuser:
                report_stage_filters.append(TravelExpenseReport.status.in_([
                    RequestStatus.TREASURY_PENDING,
                    RequestStatus.APPROVED_FOR_REIMBURSEMENT,
                    RequestStatus.REVIEW_RETURN
                ]))

        if report_stage_filters:
            pending_reports = report_query.filter(or_(*report_stage_filters)).all()
        else:
            pending_reports = []
        
        for report in pending_reports:
            item_counter += 1
            total_expenses = sum(expense.amount for expense in report.expenses) if report.expenses else 0
            prepaid_amount = float(report.prepayment.amount) if report.prepayment and report.prepayment.amount else 0
            
            # Get reason and destination from the appropriate source
            # For prepayment reports: reason and destination come from the linked prepayment
            # For reimbursement reports: reason and destination are stored directly in the report
            reason = None
            destination = None
            
            if report.prepayment_id and report.prepayment:
                # Prepayment report - get data from the prepayment
                reason = report.prepayment.reason
                # Load destination_country separately if not already loaded
                if hasattr(report.prepayment, 'destination_country') and report.prepayment.destination_country:
                    destination = report.prepayment.destination_country.name
                elif report.prepayment.destination_country_id:
                    # Fallback: query the country separately
                    country = db.query(Country).filter(Country.id == report.prepayment.destination_country_id).first()
                    destination = country.name if country else None
            else:
                # Reimbursement report - get data from the report itself
                reason = report.reason
                destination = report.country.name if report.country else None
            
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
                currency=(
                    report.currency.code if report.currency else 
                    report.prepayment.currency.code if report.prepayment and report.prepayment.currency else 
                    "USD"
                ),
                reason=reason,
                destination=destination,
                status=report.status.value if report.status else "PENDING"
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
            # Store only in rejection_reason, not in comment
            prepayment.rejection_reason = action_data.rejection_reason

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
            # Clear rejection reason on final approval
            prepayment.rejection_reason = None
        elif next_status == RequestStatus.REJECTED:
            # Persist rejection reason if provided
            if action_data.rejection_reason:
                prepayment.rejection_reason = action_data.rejection_reason

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
            entity_enum = EntityType(entity_type.upper())
            query = query.filter(Approval.entity_type == entity_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity type: {entity_type}"
            )
    
    if status_filter:
        try:
            status_enum = ApprovalStatus(status_filter.upper())
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


@router.get("/filter-options")
async def get_approval_filter_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get distinct filter options for approvals based on user's visible data
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view approval filter options"
        )
    
    # Get both pending approvals (new unified logic)
    pending_approvals = []
    
    # Prepayments pending approval
    prepayment_query = db.query(Prepayment).options(
        joinedload(Prepayment.destination_country),
        joinedload(Prepayment.requesting_user)
    )
    
    # Filter prepayments based on user role and permissions
    if not current_user.is_superuser:
        prepayment_conditions = []
        
        if current_user.profile == UserProfile.MANAGER:
            # Managers approve subordinates' prepayments
            subordinate_ids = db.query(User.id).filter(User.supervisor_id == current_user.id).subquery()
            prepayment_conditions.append(
                and_(
                    Prepayment.requesting_user_id.in_(subordinate_ids),
                    Prepayment.status == RequestStatus.SUPERVISOR_PENDING
                )
            )
        elif current_user.profile == UserProfile.ACCOUNTING:
            prepayment_conditions.append(Prepayment.status == RequestStatus.ACCOUNTING_PENDING)
        elif current_user.profile == UserProfile.TREASURY:
            prepayment_conditions.append(Prepayment.status == RequestStatus.TREASURY_PENDING)
        
        if prepayment_conditions:
            prepayment_query = prepayment_query.filter(or_(*prepayment_conditions))
        else:
            prepayment_query = prepayment_query.filter(False)  # No results
    
    prepayments = prepayment_query.all()
    
    # Travel Expense Reports pending approval
    report_query = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.country),
        joinedload(TravelExpenseReport.requesting_user),
        joinedload(TravelExpenseReport.prepayment)
    )
    
    # Filter reports based on user role and permissions
    if not current_user.is_superuser:
        report_conditions = []
        
        if current_user.profile == UserProfile.MANAGER:
            # Managers approve subordinates' reports
            subordinate_ids = db.query(User.id).filter(User.supervisor_id == current_user.id).subquery()
            report_conditions.append(
                and_(
                    TravelExpenseReport.requesting_user_id.in_(subordinate_ids),
                    TravelExpenseReport.status == RequestStatus.SUPERVISOR_PENDING
                )
            )
        elif current_user.profile == UserProfile.ACCOUNTING:
            report_conditions.append(TravelExpenseReport.status.in_([
                RequestStatus.ACCOUNTING_PENDING,
                RequestStatus.APPROVED_FOR_REIMBURSEMENT,
                RequestStatus.FUNDS_RETURN_PENDING,
                RequestStatus.REVIEW_RETURN
            ]))
        elif current_user.profile == UserProfile.TREASURY:
            report_conditions.append(TravelExpenseReport.status.in_([
                RequestStatus.TREASURY_PENDING,
                RequestStatus.APPROVED_FOR_REIMBURSEMENT,
                RequestStatus.REVIEW_RETURN
            ]))
        
        if report_conditions:
            report_query = report_query.filter(or_(*report_conditions))
        else:
            report_query = report_query.filter(False)  # No results
    
    reports = report_query.all()
    
    # Extract distinct values from prepayments
    prepayment_statuses = set(p.status.value for p in prepayments if p.status)
    prepayment_countries = set((p.destination_country.id, p.destination_country.name) for p in prepayments if p.destination_country)
    prepayment_types = {"PREPAYMENT"}
    
    # Extract distinct values from reports  
    report_statuses = set(r.status.value for r in reports if r.status)
    report_countries = set((r.country.id, r.country.name) for r in reports if r.country)
    # Add prepayment destination countries for prepayment-linked reports
    report_countries.update((r.prepayment.destination_country.id, r.prepayment.destination_country.name) 
                           for r in reports if r.prepayment and r.prepayment.destination_country)
    report_types = set(r.report_type.value for r in reports if r.report_type)
    
    # Combine all distinct values
    all_statuses = prepayment_statuses | report_statuses
    all_countries = prepayment_countries | report_countries  
    all_types = prepayment_types | report_types
    
    # Convert to lists and sort
    distinct_statuses = sorted(list(all_statuses))
    distinct_countries = [{'id': country_id, 'name': country_name} for country_id, country_name in all_countries]
    distinct_countries = sorted(distinct_countries, key=lambda x: x['name'])
    distinct_types = sorted(list(all_types))
    
    return {
        "statuses": distinct_statuses,
        "countries": distinct_countries,
        "types": distinct_types
    }


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


@router.post("/reports/{report_id}/submit")
async def submit_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a travel expense report into the multi-stage approval workflow.
    Allowed when status is PENDING or REJECTED.
    """
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.requesting_user),
        joinedload(TravelExpenseReport.expenses)
    ).filter(TravelExpenseReport.id == report_id).first()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    # Only owner or superuser can submit
    if not current_user.is_superuser and report.requesting_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to submit")

    if report.status not in [RequestStatus.PENDING, RequestStatus.REJECTED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report cannot be submitted in its current status")

    # Validate that report has expenses
    if not report.expenses or len(report.expenses) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot submit report for approval without expenses. Please add at least one expense before submitting."
        )

    requester = report.requesting_user
    if not requester or requester.supervisor_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing supervisor")

    supervisor = db.query(User).filter(User.id == requester.supervisor_id).first()
    if not supervisor or not supervisor.is_approver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supervisor do not have approval permits")

    try:
        # Capture current status before changing it
        current_status = report.status.value if hasattr(report.status, 'value') else str(report.status)
        
        # Reset rejected expenses (those with rejection reasons) and clear rejection reasons
        for expense in report.expenses:
            if expense.rejection_reason:  # If expense was rejected (has rejection reason)
                expense.status = ExpenseStatus.PENDING
                expense.rejection_reason = None
                expense.updated_at = datetime.utcnow()

        report.status = RequestStatus.SUPERVISOR_PENDING
        report.updated_at = datetime.utcnow()

        # History
        db.add(ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "employee",
            action=HistoryAction.SUBMITTED,
            from_status=current_status,
            to_status=RequestStatus.SUPERVISOR_PENDING.value,
            comments="Submitted for approval"
        ))

        db.commit()
        return {"message": "Report submitted for approval", "status": "SUPERVISOR_PENDING"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to submit report: {str(e)}")


@router.post("/reports/{report_id}/approve", response_model=ReportApprovalResponse)
async def approve_report(
    report_id: int,
    action_data: ReportApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a travel expense report with expense-level rejection support
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to approve/reject reports"
        )
    
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.expenses),
        joinedload(TravelExpenseReport.requesting_user)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    if report.status == RequestStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report already approved")
    
    # Validate action
    if action_data.action not in ["approve", "reject"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Must be 'approve' or 'reject'")
    
    # Validation: Cannot approve if any expense has rejection_reason
    if action_data.action == "approve":
        expenses_with_rejections = [e for e in report.expenses if e.rejection_reason]
        if expenses_with_rejections:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Cannot approve report with rejected expenses. Please resolve rejections first."
            )
    
    # Validation: Must have at least one expense rejection to reject report
    if action_data.action == "reject":
        if not action_data.expense_rejections or len(action_data.expense_rejections) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one expense must have a rejection reason to reject the report"
            )

    try:
        requester = report.requesting_user
        next_status = None
        message = None
        expense_updates = {}

        # Determine stage and permissions
        if report.status == RequestStatus.SUPERVISOR_PENDING:
            if not (requester and requester.supervisor_id == current_user.id and current_user.is_approver):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for supervisor stage")
            
            if action_data.action == "approve":
                # Check accounting approvers exist
                has_accounting = db.query(User).filter(
                    User.profile == UserProfile.ACCOUNTING,
                    User.is_approver == True
                ).count() > 0
                if not has_accounting:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error - no accounting users available")
                next_status = RequestStatus.ACCOUNTING_PENDING
                message = "Report approved by supervisor; pending accounting approval"
            else:
                next_status = RequestStatus.REJECTED
                message = "Report rejected at supervisor stage"

        elif report.status == RequestStatus.ACCOUNTING_PENDING:
            if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for accounting stage")
            
            if action_data.action == "approve":
                # Calculate total expenses
                total_expenses = sum(expense.amount for expense in report.expenses) if report.expenses else 0
                
                # Get prepaid amount (for prepayment reports) or 0 (for reimbursement reports)
                prepaid_amount = float(report.prepayment.amount) if report.prepayment and report.prepayment.amount else 0
                
                # Round to 2 decimals for strict comparison
                total_expenses = round(float(total_expenses), 2)
                prepaid_amount = round(prepaid_amount, 2)
                
                # Business Logic Implementation:
                if report.prepayment_id and prepaid_amount == total_expenses:
                    # Rule 1: Prepayment type - equal amounts - skip treasury
                    next_status = RequestStatus.APPROVED_EXPENSES
                    message = "Report approved by accounting - amounts match, no treasury approval needed"
                elif total_expenses > prepaid_amount:
                    # Rule 2: Any case - over budget - needs reimbursement
                    next_status = RequestStatus.APPROVED_FOR_REIMBURSEMENT
                    message = "Report approved by accounting - pending treasury for reimbursement"
                else:
                    # Rule 3: Any case - under budget - needs fund return documents
                    next_status = RequestStatus.FUNDS_RETURN_PENDING
                    message = "Report approved by accounting - employee must submit fund return documents"
                
                # Check treasury approvers exist for cases that need treasury
                if next_status in [RequestStatus.APPROVED_FOR_REIMBURSEMENT, RequestStatus.FUNDS_RETURN_PENDING]:
                    has_treasury = db.query(User).filter(
                        User.profile == UserProfile.TREASURY,
                        User.is_approver == True
                    ).count() > 0
                    if not has_treasury:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error - no treasury users available")
            else:
                next_status = RequestStatus.REJECTED
                message = "Report rejected at accounting stage"

        elif report.status in [RequestStatus.TREASURY_PENDING, RequestStatus.APPROVED_FOR_REIMBURSEMENT, RequestStatus.REVIEW_RETURN]:
            if not (current_user.is_approver and current_user.profile == UserProfile.TREASURY):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for treasury stage")
            
            if action_data.action == "approve":
                if report.status == RequestStatus.APPROVED_FOR_REIMBURSEMENT:
                    next_status = RequestStatus.APPROVED_REPAID
                    message = "Report approved by treasury - reimbursement processed"
                elif report.status == RequestStatus.REVIEW_RETURN:
                    next_status = RequestStatus.APPROVED_RETURNED_FUNDS
                    message = "Report approved by treasury - fund return processed"
                else:
                    next_status = RequestStatus.APPROVED_EXPENSES
                    message = "Report approved by treasury"
                
                # Set ALL expenses to APPROVED
                for expense in report.expenses:
                    expense.status = ExpenseStatus.APPROVED
                    expense.updated_at = datetime.utcnow()
                    expense_updates[expense.id] = "APPROVED"
            else:
                next_status = RequestStatus.REJECTED
                if report.status == RequestStatus.APPROVED_FOR_REIMBURSEMENT:
                    message = "Report rejected at treasury stage - reimbursement denied"
                elif report.status == RequestStatus.REVIEW_RETURN:
                    # Special case: rejection sends back to FUNDS_RETURN_PENDING for resubmission
                    next_status = RequestStatus.FUNDS_RETURN_PENDING
                    message = "Fund return documents rejected - employee must resubmit"
                else:
                    message = "Report rejected at treasury stage"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not in an approval stage")

        # Handle expense rejections
        if action_data.action == "reject" and action_data.expense_rejections:
            for expense_rejection in action_data.expense_rejections:
                expense = db.query(Expense).filter(Expense.id == expense_rejection.expense_id).first()
                if expense and expense.travel_expense_report_id == report.id:
                    expense.rejection_reason = expense_rejection.rejection_reason
                    # Keep expense as PENDING but with rejection reason (no REJECTED status in enum)
                    expense.status = ExpenseStatus.PENDING
                    expense.updated_at = datetime.utcnow()
                    expense_updates[expense.id] = "REJECTED"
                    
                    # Save rejection history
                    db.add(ExpenseRejectionHistory(
                        expense_id=expense.id,
                        report_id=report.id,
                        user_id=current_user.id,
                        user_role=current_user.profile.value if current_user.profile else "unknown",
                        rejection_reason=expense_rejection.rejection_reason,
                        approval_stage=report.status.value
                    ))

        # Update report status
        report.status = next_status
        report.updated_at = datetime.utcnow()

        # Save approval history
        expense_rejections_json = None
        if action_data.expense_rejections:
            expense_rejections_json = str([{
                "expense_id": er.expense_id,
                "rejection_reason": er.rejection_reason
            } for er in action_data.expense_rejections])

        db.add(ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "unknown",
            action=HistoryAction.APPROVED if action_data.action == "approve" else HistoryAction.REJECTED,
            from_status=report.status.value,
            to_status=next_status.value,
            comments=action_data.rejection_reason or message,
            expense_rejections=expense_rejections_json
        ))

        db.commit()
        
        return ReportApprovalResponse(
            report_id=report.id,
            status=next_status.value,
            message=message,
            expense_updates=expense_updates if expense_updates else None
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process approval: {str(e)}")


@router.post("/reports/{report_id}/quick-approve", response_model=ReportApprovalResponse)
async def quick_approve_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick approve a travel expense report (supervisor/treasury only)
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to approve reports"
        )
    
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.expenses),
        joinedload(TravelExpenseReport.requesting_user)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    if report.status == RequestStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report already approved")
    
    try:
        requester = report.requesting_user
        next_status = None
        message = None
        expense_updates = {}

        # Determine stage and permissions
        if report.status == RequestStatus.SUPERVISOR_PENDING:
            if not (requester and requester.supervisor_id == current_user.id and current_user.is_approver):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for supervisor stage")
            
            # Check accounting approvers exist
            has_accounting = db.query(User).filter(
                User.profile == UserProfile.ACCOUNTING,
                User.is_approver == True
            ).count() > 0
            if not has_accounting:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error - no accounting users available")
            next_status = RequestStatus.ACCOUNTING_PENDING
            message = "Report quickly approved by supervisor; pending accounting approval"

        elif report.status in [RequestStatus.TREASURY_PENDING, RequestStatus.APPROVED_FOR_REIMBURSEMENT, RequestStatus.REVIEW_RETURN]:
            if not (current_user.is_approver and current_user.profile == UserProfile.TREASURY):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for treasury stage")
            
            if report.status == RequestStatus.APPROVED_FOR_REIMBURSEMENT:
                next_status = RequestStatus.APPROVED_REPAID
                message = "Report quickly approved by treasury - reimbursement processed"
            elif report.status == RequestStatus.REVIEW_RETURN:
                next_status = RequestStatus.APPROVED_RETURNED_FUNDS
                message = "Report quickly approved by treasury - fund return processed"
            else:
                next_status = RequestStatus.APPROVED_EXPENSES
                message = "Report quickly approved by treasury"
            
            # Set ALL expenses to APPROVED
            for expense in report.expenses:
                expense.status = ExpenseStatus.APPROVED
                expense.updated_at = datetime.utcnow()
                expense_updates[expense.id] = "APPROVED"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not in a quick approval stage")

        # Update report status
        report.status = next_status
        report.updated_at = datetime.utcnow()

        # Create approval history record
        approval_history = ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "user",
            action=HistoryAction.APPROVED,
            from_status=report.status.value if hasattr(report.status, 'value') else str(report.status),
            to_status=next_status.value if hasattr(next_status, 'value') else str(next_status),
            comments="Quick approval"
        )
        db.add(approval_history)

        db.commit()

        return ReportApprovalResponse(
            report_id=report.id,
            status=next_status.value if hasattr(next_status, 'value') else str(next_status),
            message=message,
            expense_updates=expense_updates if expense_updates else None
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to quick approve report: {str(e)}")


@router.post("/reports/{report_id}/quick-reject", response_model=ReportApprovalResponse)
async def quick_reject_report(
    report_id: int,
    action_data: QuickApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick reject a travel expense report (supervisor/treasury only)
    """
    # Check if user can approve (superuser or approver)
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to reject reports"
        )
    
    # Validate rejection reason is provided
    if not action_data.rejection_reason or action_data.rejection_reason.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )
    
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.expenses),
        joinedload(TravelExpenseReport.requesting_user)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    if report.status == RequestStatus.REJECTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report already rejected")
    
    try:
        requester = report.requesting_user
        message = None

        # Determine stage and permissions
        if report.status == RequestStatus.SUPERVISOR_PENDING:
            if not (requester and requester.supervisor_id == current_user.id and current_user.is_approver):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for supervisor stage")
            message = "Report quickly rejected at supervisor stage"

        elif report.status in [RequestStatus.TREASURY_PENDING, RequestStatus.APPROVED_FOR_REIMBURSEMENT, RequestStatus.REVIEW_RETURN]:
            if not (current_user.is_approver and current_user.profile == UserProfile.TREASURY):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for treasury stage")
            
            if report.status == RequestStatus.APPROVED_FOR_REIMBURSEMENT:
                message = "Report quickly rejected at treasury stage - reimbursement denied"
            elif report.status == RequestStatus.REVIEW_RETURN:
                message = "Report quickly rejected at treasury stage - fund return denied"
            else:
                message = "Report quickly rejected at treasury stage"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not in a quick rejection stage")

        # Update report status and rejection reason
        old_status = report.status
        
        # Special case: REVIEW_RETURN rejections go back to FUNDS_RETURN_PENDING
        if report.status == RequestStatus.REVIEW_RETURN:
            report.status = RequestStatus.FUNDS_RETURN_PENDING
            message = "Fund return documents rejected - employee must resubmit"
        else:
            report.status = RequestStatus.REJECTED
            
        report.rejection_reason = action_data.rejection_reason
        report.updated_at = datetime.utcnow()

        # Create approval history record
        approval_history = ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "user",
            action=HistoryAction.REJECTED,
            from_status=old_status.value if hasattr(old_status, 'value') else str(old_status),
            to_status=report.status.value,
            comments=f"Quick rejection: {action_data.rejection_reason}"
        )
        db.add(approval_history)

        db.commit()

        return ReportApprovalResponse(
            report_id=report.id,
            status=report.status.value,
            message=message,
            expense_updates=None
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to quick reject report: {str(e)}")


@router.post("/expenses/{expense_id}/approve", response_model=dict)
async def approve_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve an individual expense (accounting only)
    """
    # Check if user can approve (superuser or accounting approver)
    if not (current_user.is_superuser or (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to approve expenses"
        )
    
    expense = db.query(Expense).options(
        joinedload(Expense.travel_expense_report)
    ).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    if not expense.travel_expense_report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense must be linked to a report")
    
    report = expense.travel_expense_report
    if report.status != RequestStatus.ACCOUNTING_PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not in accounting approval stage")
    
    if expense.status == ExpenseStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is already approved")
    
    try:
        # Update expense status
        expense.status = ExpenseStatus.APPROVED
        expense.rejection_reason = None  # Clear any previous rejection
        expense.updated_at = datetime.utcnow()

        # Check if all expenses in the report are now processed
        all_expenses = report.expenses
        unprocessed_expenses = [e for e in all_expenses if e.status not in [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED]]
        
        report_status_changed = False
        if len(unprocessed_expenses) == 0:
            # All expenses are processed, determine report outcome
            rejected_expenses = [e for e in all_expenses if e.status == ExpenseStatus.REJECTED]
            
            if len(rejected_expenses) > 0:
                # At least one expense rejected, reject the entire report
                report.status = RequestStatus.REJECTED
                report.rejection_reason = f"Report rejected due to {len(rejected_expenses)} rejected expense(s)"
                report_status_changed = True
            else:
                # All expenses approved, continue with normal approval logic
                total_expenses = sum(expense.amount for expense in all_expenses) if all_expenses else 0
                prepaid_amount = float(report.prepayment.amount) if report.prepayment and report.prepayment.amount else 0
                
                # Round to 2 decimals for strict comparison
                total_expenses = round(float(total_expenses), 2)
                prepaid_amount = round(prepaid_amount, 2)
                
                # Business Logic Implementation:
                if report.prepayment_id and prepaid_amount == total_expenses:
                    # Rule 1: Prepayment type - equal amounts - skip treasury
                    report.status = RequestStatus.APPROVED_EXPENSES
                elif total_expenses > prepaid_amount:
                    # Rule 2: Any case - over budget - needs reimbursement
                    report.status = RequestStatus.APPROVED_FOR_REIMBURSEMENT
                else:
                    # Rule 3: Any case - under budget - needs fund return documents
                    report.status = RequestStatus.FUNDS_RETURN_PENDING
                
                report_status_changed = True

        if report_status_changed:
            report.updated_at = datetime.utcnow()

        db.commit()

        return {
            "message": "Expense approved successfully",
            "expense_id": expense.id,
            "expense_status": ExpenseStatus.APPROVED.value,
            "report_status_changed": report_status_changed,
            "new_report_status": report.status.value if report_status_changed else None
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to approve expense: {str(e)}")


@router.post("/expenses/{expense_id}/reject", response_model=dict)
async def reject_expense(
    expense_id: int,
    action_data: ExpenseApprovalAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject an individual expense (accounting only)
    """
    # Check if user can approve (superuser or accounting approver)
    if not (current_user.is_superuser or (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to reject expenses"
        )
    
    # Validate rejection reason is provided
    if not action_data.rejection_reason or action_data.rejection_reason.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )
    
    expense = db.query(Expense).options(
        joinedload(Expense.travel_expense_report)
    ).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    if not expense.travel_expense_report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense must be linked to a report")
    
    report = expense.travel_expense_report
    if report.status != RequestStatus.ACCOUNTING_PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report is not in accounting approval stage")
    
    if expense.status == ExpenseStatus.REJECTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense is already rejected")
    
    try:
        # Update expense status
        expense.status = ExpenseStatus.REJECTED
        expense.rejection_reason = action_data.rejection_reason
        expense.updated_at = datetime.utcnow()

        # Check if all expenses in the report are now processed
        all_expenses = report.expenses
        unprocessed_expenses = [e for e in all_expenses if e.status not in [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED]]
        
        report_status_changed = False
        if len(unprocessed_expenses) == 0:
            # All expenses are processed, since at least one is rejected, reject the report
            rejected_expenses = [e for e in all_expenses if e.status == ExpenseStatus.REJECTED]
            report.status = RequestStatus.REJECTED
            report.rejection_reason = f"Report rejected due to {len(rejected_expenses)} rejected expense(s)"
            report.updated_at = datetime.utcnow()
            report_status_changed = True

        db.commit()

        return {
            "message": "Expense rejected successfully",
            "expense_id": expense.id,
            "expense_status": ExpenseStatus.REJECTED.value,
            "rejection_reason": action_data.rejection_reason,
            "report_status_changed": report_status_changed,
            "new_report_status": report.status.value if report_status_changed else None
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to reject expense: {str(e)}")


@router.post("/reports/{report_id}/submit-return-documents")
async def submit_fund_return_documents(
    report_id: int,
    document_number: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit fund return documents for a report in FUNDS_RETURN_PENDING status.
    Employee uploads supporting documents and document number, then status changes to REVIEW_RETURN.
    """
    # Get the report
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Check permissions - only owner or superuser can submit
    if not current_user.is_superuser and report.requesting_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to submit documents")
    
    # Check status
    if report.status != RequestStatus.FUNDS_RETURN_PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Report must be in FUNDS_RETURN_PENDING status to submit documents. Current status: {report.status.value}"
        )
    
    # Validate files
    if not files or len(files) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one file must be uploaded")
    
    # Validate file sizes (10MB limit)
    max_file_size = 10 * 1024 * 1024  # 10MB in bytes
    for file in files:
        if file.size and file.size > max_file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"File {file.filename} exceeds 10MB limit"
            )
    
    try:
        # Create storage directory
        storage_dir = f"/app/storage/uploads/reports/fund-returns/{report_id}"
        os.makedirs(storage_dir, exist_ok=True)
        
        # Save files and collect file paths
        saved_files = []
        for file in files:
            # Generate unique filename
            file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(storage_dir, unique_filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            saved_files.append({
                "original_name": file.filename,
                "stored_name": unique_filename,
                "file_path": file_path,
                "size": len(content)
            })
        
        # Update report with document info and change status
        report.return_document_number = document_number
        report.return_document_files = saved_files
        report.status = RequestStatus.REVIEW_RETURN
        report.updated_at = datetime.utcnow()
        
        # Create approval history record
        approval_history = ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if current_user.profile else "employee",
            action=HistoryAction.SUBMITTED,
            from_status=RequestStatus.FUNDS_RETURN_PENDING.value,
            to_status=RequestStatus.REVIEW_RETURN.value,
            comments=f"Fund return documents submitted - Document #: {document_number}"
        )
        db.add(approval_history)
        
        db.commit()
        
        return {
            "message": "Fund return documents submitted successfully",
            "report_id": report_id,
            "new_status": RequestStatus.REVIEW_RETURN.value,
            "document_number": document_number,
            "files_uploaded": len(saved_files)
        }
        
    except Exception as e:
        db.rollback()
        # Clean up uploaded files on error
        for file_info in saved_files:
            try:
                if os.path.exists(file_info["file_path"]):
                    os.remove(file_info["file_path"])
            except:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to submit fund return documents: {str(e)}"
        )


@router.get("/reports/{report_id}/return-documents")
async def get_fund_return_documents(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get fund return documents for a report.
    Available to report owner, treasury users, and superusers.
    """
    # Get the report
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Check permissions
    is_owner = report.requesting_user_id == current_user.id
    is_treasury = current_user.profile == UserProfile.TREASURY and current_user.is_approver
    
    if not (current_user.is_superuser or is_owner or is_treasury):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to view documents")
    
    # Check if documents exist
    if not report.return_document_number or not report.return_document_files:
        return {
            "report_id": report_id,
            "document_number": None,
            "files": [],
            "status": report.status.value
        }
    
    return {
        "report_id": report_id,
        "document_number": report.return_document_number,
        "files": report.return_document_files,
        "status": report.status.value
    }


@router.get("/reports/{report_id}/return-documents/{file_name}")
async def download_fund_return_document(
    report_id: int,
    file_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download a specific fund return document file.
    Available to report owner, treasury users, and superusers.
    """
    # Get the report
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Check permissions
    is_owner = report.requesting_user_id == current_user.id
    is_treasury = current_user.profile == UserProfile.TREASURY and current_user.is_approver
    
    if not (current_user.is_superuser or is_owner or is_treasury):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions to download file")
    
    # Check if documents exist
    if not report.return_document_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No return documents found")
    
    # Find the file in the stored files
    target_file = None
    for file_info in report.return_document_files:
        if file_info.get('stored_name') == file_name:
            target_file = file_info
            break
    
    if not target_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    # Use the file path stored in the database
    file_path = target_file.get('file_path', '')
    
    # Check if file exists on disk
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")
    
    # Return the file
    return FileResponse(
        path=file_path,
        filename=target_file.get('original_name', file_name),
        media_type='application/octet-stream'
    )


