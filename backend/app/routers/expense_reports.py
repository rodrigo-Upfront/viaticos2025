"""
Travel Expense Reports Router
Handles travel expense report management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.database.connection import get_db
from app.models.models import (
    User, TravelExpenseReport, Prepayment, Expense, Country, RequestStatus, ReportType, Currency, UserProfile
)
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.expense_report_schemas import (
    ExpenseReportCreate, ExpenseReportManualCreate, ExpenseReportUpdate, ExpenseReportResponse, 
    ExpenseReportList, ExpenseReportStatusUpdate, ExpenseReportSummary
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=ExpenseReportList)
async def get_expense_reports(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all expense reports for the current user (or all if superuser)
    """
    query = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
        joinedload(TravelExpenseReport.requesting_user),
        joinedload(TravelExpenseReport.expenses)
    )
    
    # Non-superusers can only see their own reports
    if not current_user.is_superuser:
        query = query.filter(TravelExpenseReport.requesting_user_id == current_user.id)
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = RequestStatus(status_filter)
            query = query.filter(TravelExpenseReport.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    reports = query.order_by(TravelExpenseReport.created_at.desc()).offset(skip).limit(limit).all()
    
    return ExpenseReportList(
        reports=[ExpenseReportResponse.from_orm(report) for report in reports],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/summary", response_model=ExpenseReportSummary)
async def get_expense_reports_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get expense reports summary/dashboard data
    """
    # Base query filtered by user permissions
    base_query = db.query(TravelExpenseReport)
    if not current_user.is_superuser:
        base_query = base_query.filter(TravelExpenseReport.requesting_user_id == current_user.id)
    
    # Get status counts
    total_reports = base_query.count()
    pending_reports = base_query.filter(TravelExpenseReport.status == RequestStatus.PENDING).count()
    approved_reports = base_query.filter(TravelExpenseReport.status == RequestStatus.APPROVED).count()
    rejected_reports = base_query.filter(TravelExpenseReport.status == RequestStatus.REJECTED).count()
    
    # Get amount totals
    reports_with_prepayments = base_query.join(Prepayment).all()
    total_amount = sum(report.prepayment.amount for report in reports_with_prepayments) if reports_with_prepayments else Decimal('0')
    
    # Get expense totals
    expense_query = db.query(func.sum(Expense.amount)).join(TravelExpenseReport)
    if not current_user.is_superuser:
        expense_query = expense_query.filter(TravelExpenseReport.requesting_user_id == current_user.id)
    total_expenses = expense_query.scalar() or Decimal('0')
    
    # Calculate average
    average_report_amount = total_amount / total_reports if total_reports > 0 else Decimal('0')
    
    return ExpenseReportSummary(
        total_reports=total_reports,
        pending_reports=pending_reports,
        approved_reports=approved_reports,
        rejected_reports=rejected_reports,
        total_amount=total_amount,
        total_expenses=total_expenses,
        average_report_amount=average_report_amount
    )


@router.get("/{report_id}", response_model=ExpenseReportResponse)
async def get_expense_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific expense report by ID
    """
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
        joinedload(TravelExpenseReport.requesting_user),
        joinedload(TravelExpenseReport.expenses)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Permission check: 
    # 1. Superusers can access any report
    # 2. Report owners can access their own reports  
    # 3. Approvers can access reports in their approval stage
    if not current_user.is_superuser and report.requesting_user_id != current_user.id:
        # Check if current user is an approver who can approve this report
        can_approve = False
        
        if current_user.is_approver:
            # Supervisor can approve reports in SUPERVISOR_PENDING stage
            if (report.status == RequestStatus.SUPERVISOR_PENDING and 
                current_user.profile == UserProfile.MANAGER and
                report.requesting_user and report.requesting_user.supervisor_id == current_user.id):
                can_approve = True
            
            # Accounting can approve reports in ACCOUNTING_PENDING stage  
            elif (report.status == RequestStatus.ACCOUNTING_PENDING and
                  current_user.profile == UserProfile.ACCOUNTING):
                can_approve = True
            
            # Treasury can approve reports in treasury stages
            elif (report.status in [RequestStatus.TREASURY_PENDING, 
                                    RequestStatus.APPROVED_FOR_REIMBURSEMENT, 
                                    RequestStatus.FUNDS_RETURN_PENDING] and
                  current_user.profile == UserProfile.TREASURY):
                can_approve = True
        
        if not can_approve:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return ExpenseReportResponse.from_orm(report)


@router.post("/", response_model=ExpenseReportResponse)
async def create_expense_report(
    report_data: ExpenseReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new expense report from an existing prepayment
    """
    # Verify prepayment exists and is approved
    prepayment = db.query(Prepayment).filter(Prepayment.id == report_data.prepayment_id).first()
    if not prepayment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prepayment not found"
        )
    
    # Check permissions
    if not current_user.is_superuser and prepayment.requesting_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create report for this prepayment"
        )
    
    # Check if prepayment is approved
    if prepayment.status != RequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only create expense reports for approved prepayments"
        )
    
    # Check if report already exists for this prepayment
    existing_report = db.query(TravelExpenseReport).filter(
        TravelExpenseReport.prepayment_id == report_data.prepayment_id
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense report already exists for this prepayment"
        )
    
    try:
        report = TravelExpenseReport(
            prepayment_id=report_data.prepayment_id,
            requesting_user_id=current_user.id,
            status=RequestStatus.PENDING
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # Load relationships for response
        report = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
            joinedload(TravelExpenseReport.requesting_user),
            joinedload(TravelExpenseReport.expenses)
        ).filter(TravelExpenseReport.id == report.id).first()
        
        return ExpenseReportResponse.from_orm(report)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense report: {str(e)}"
        )


@router.post("/manual", response_model=ExpenseReportResponse)
async def create_manual_reimbursement_report(
    body: ExpenseReportManualCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a manual reimbursement travel expense report (no prepayment)
    """
    # Validate foreign keys
    country = db.query(Country).filter(Country.id == body.country_id).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    currency = db.query(Currency).filter(Currency.id == body.currency_id).first()
    if not currency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Currency not found")

    # Validate date range
    if body.start_date >= body.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    try:
        report = TravelExpenseReport(
            prepayment_id=None,
            report_type=ReportType.REIMBURSEMENT,
            reason=body.reason,
            country_id=body.country_id,
            currency_id=body.currency_id,
            start_date=body.start_date,
            end_date=body.end_date,
            requesting_user_id=current_user.id,
            status=RequestStatus.PENDING
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        report = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.requesting_user),
            joinedload(TravelExpenseReport.expenses),
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country)
        ).filter(TravelExpenseReport.id == report.id).first()
        return ExpenseReportResponse.from_orm(report)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create reimbursement report: {str(e)}")

@router.patch("/{report_id}/status", response_model=ExpenseReportResponse)
async def update_expense_report_status(
    report_id: int,
    status_data: ExpenseReportStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update expense report status (for approvers/superusers)
    """
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Only approvers and superusers can change status
    if not (current_user.is_superuser or current_user.is_approver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to change status"
        )
    
    try:
        status_enum = RequestStatus(status_data.status)
        report.status = status_enum
        report.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(report)
        
        # Load relationships for response
        report = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
            joinedload(TravelExpenseReport.requesting_user),
            joinedload(TravelExpenseReport.expenses)
        ).filter(TravelExpenseReport.id == report.id).first()
        
        return ExpenseReportResponse.from_orm(report)
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status_data.status}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update expense report status: {str(e)}"
        )


@router.delete("/{report_id}")
async def delete_expense_report(
    report_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """
    Delete an expense report (superuser only)
    Note: This will also delete all associated expenses
    """
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    try:
        # Note: Expenses will be deleted automatically due to foreign key constraints
        db.delete(report)
        db.commit()
        
        return {"message": "Expense report deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete expense report: {str(e)}"
        )

