"""
Accounting Approval Router
Handles 4-step accounting approval workflow for expense reports
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import os

from app.database.connection import get_db
from app.models.models import (
    User, TravelExpenseReport, Expense, DocumentType, ExpenseStatus,
    RequestStatus, UserProfile, ApprovalHistory, ApprovalAction as HistoryAction,
    Approval, ApprovalStatus, EntityType
)
from app.services.auth_service import get_current_user
from app.services.sap_service import SAPService, SAPFileGenerationError
from app.schemas.accounting_approval_schemas import (
    SAPInvoiceNumbersRequest, AccountingCompensationRequest, 
    AccountingApprovalResponse, AccountingApprovalState
)

router = APIRouter()


@router.post("/reports/{report_id}/accounting/expenses-file", response_model=AccountingApprovalResponse)
async def generate_expenses_file(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1: Generate SAP expenses report file for accounting approval
    """
    # Check permissions
    if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for accounting operations"
        )
    
    # Get report with all relationships
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.requesting_user).joinedload(User.location),
        joinedload(TravelExpenseReport.expenses).joinedload(Expense.category),
        joinedload(TravelExpenseReport.expenses).joinedload(Expense.currency),
        joinedload(TravelExpenseReport.expenses).joinedload(Expense.tax),
        joinedload(TravelExpenseReport.prepayment)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Verify all expenses are approved (accounting approval trigger)
    approved_expenses = [exp for exp in report.expenses if exp.status == ExpenseStatus.APPROVED]
    if len(approved_expenses) != len(report.expenses):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not all expenses in the report are approved"
        )
    
    try:
        # Delete old expenses file if exists
        if report.sap_expenses_file:
            SAPService.delete_file(report.sap_expenses_file)
        
        # Generate new SAP expenses file
        sap_expenses_file = SAPService.generate_expenses_report_file(report, db)
        
        # Update report
        report.sap_expenses_file = sap_expenses_file
        report.updated_at = datetime.utcnow()
        
        # Get FACTURA expenses for next step
        factura_expenses = [
            {
                "id": exp.id,
                "category_name": exp.category.name if exp.category else "",
                "purpose": exp.purpose,
                "amount": float(exp.amount),
                "expense_date": exp.expense_date.isoformat(),
                "document_number": exp.document_number,
                "sap_invoice_number": exp.sap_invoice_number or ""
            }
            for exp in report.expenses 
            if exp.document_type == DocumentType.FACTURA and exp.status == ExpenseStatus.APPROVED
        ]
        
        db.commit()
        
        return AccountingApprovalResponse(
            success=True,
            message="SAP expenses file generated successfully",
            report_id=report_id,
            step=1,
            sap_expenses_file=sap_expenses_file,
            factura_expenses=factura_expenses
        )
        
    except SAPFileGenerationError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate expenses file: {str(e)}"
        )


@router.post("/reports/{report_id}/accounting/invoice-numbers", response_model=AccountingApprovalResponse)
async def update_sap_invoice_numbers(
    report_id: int,
    invoice_data: SAPInvoiceNumbersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 2: Update SAP invoice numbers for FACTURA expenses
    """
    # Check permissions
    if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for accounting operations"
        )
    
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    if not report.sap_expenses_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAP expenses file must be generated first"
        )
    
    try:
        # Update SAP invoice numbers for each expense
        for invoice_update in invoice_data.invoice_numbers:
            expense = db.query(Expense).filter(
                Expense.id == invoice_update.expense_id,
                Expense.travel_expense_report_id == report_id,
                Expense.document_type == DocumentType.FACTURA
            ).first()
            
            if not expense:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"FACTURA expense {invoice_update.expense_id} not found in report"
                )
            
            expense.sap_invoice_number = invoice_update.sap_invoice_number
            expense.updated_at = datetime.utcnow()
        
        db.commit()
        
        return AccountingApprovalResponse(
            success=True,
            message="SAP invoice numbers updated successfully",
            report_id=report_id,
            step=2
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update SAP invoice numbers: {str(e)}"
        )


@router.post("/reports/{report_id}/accounting/compensation-file", response_model=AccountingApprovalResponse)
async def generate_compensation_file(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 3: Generate SAP compensation report file
    """
    # Check permissions
    if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for accounting operations"
        )
    
    # Get report with relationships
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.requesting_user).joinedload(User.location),
        joinedload(TravelExpenseReport.expenses).joinedload(Expense.category),
        joinedload(TravelExpenseReport.prepayment)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Check if there are FACTURA expenses
    factura_expenses = [exp for exp in report.expenses if exp.document_type == DocumentType.FACTURA and exp.status == ExpenseStatus.APPROVED]
    
    # Only require expenses file if there are FACTURA expenses
    if factura_expenses and not report.sap_expenses_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAP expenses file must be generated first"
        )
    
    try:
        # Delete old compensation file if exists
        if report.sap_compensation_file:
            SAPService.delete_file(report.sap_compensation_file)
        
        # Generate new SAP compensation file
        sap_compensation_file = SAPService.generate_compensation_report_file(report, db)
        
        # Update report
        report.sap_compensation_file = sap_compensation_file
        report.updated_at = datetime.utcnow()
        
        db.commit()
        
        return AccountingApprovalResponse(
            success=True,
            message="SAP compensation file generated successfully",
            report_id=report_id,
            step=3,
            sap_compensation_file=sap_compensation_file
        )
        
    except SAPFileGenerationError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate compensation file: {str(e)}"
        )


@router.post("/reports/{report_id}/accounting/complete", response_model=AccountingApprovalResponse)
async def complete_accounting_approval(
    report_id: int,
    compensation_data: AccountingCompensationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 4: Complete accounting approval with compensation number
    """
    # Check permissions
    if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for accounting operations"
        )
    
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    if not report.sap_compensation_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAP compensation file must be generated first"
        )
    
    try:
        # Update report with compensation number
        report.sap_compensation_number = compensation_data.sap_compensation_number
        report.updated_at = datetime.utcnow()
        
        # Apply business logic to determine next status
        # Calculate total expenses vs prepaid amount
        total_expenses = sum(expense.amount for expense in report.expenses) if report.expenses else 0
        prepaid_amount = float(report.prepayment.amount) if report.prepayment and report.prepayment.amount else 0
        
        # Round to 2 decimals for strict comparison
        total_expenses = round(float(total_expenses), 2)
        prepaid_amount = round(prepaid_amount, 2)
        
        # Business Logic Implementation:
        if report.prepayment_id and prepaid_amount == total_expenses:
            # Rule 1: Prepayment type - equal amounts - skip treasury
            report.status = RequestStatus.APPROVED_EXPENSES
            status_message = "amounts match, no treasury approval needed"
        elif total_expenses > prepaid_amount:
            # Rule 2: Any case - over budget - needs reimbursement
            report.status = RequestStatus.APPROVED_FOR_REIMBURSEMENT
            status_message = "pending treasury for reimbursement"
        else:
            # Rule 3: Any case - under budget - needs fund return documents
            report.status = RequestStatus.FUNDS_RETURN_PENDING
            status_message = "employee must submit fund return documents"
        
        # Check treasury approvers exist for cases that need treasury
        if report.status in [RequestStatus.APPROVED_FOR_REIMBURSEMENT, RequestStatus.FUNDS_RETURN_PENDING]:
            from app.models.models import User, UserProfile
            has_treasury = db.query(User).filter(
                User.profile == UserProfile.TREASURY,
                User.is_approver == True
            ).count() > 0
            if not has_treasury:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Error - no treasury users available"
                )
        
        # Create approval record
        approval = Approval(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report_id,
            approver_user_id=current_user.id,
            status=ApprovalStatus.APPROVED,
            approval_level=1,
            approved_at=datetime.utcnow()
        )
        db.add(approval)
        
        # Create history record
        db.add(ApprovalHistory(
            entity_type=EntityType.TRAVEL_EXPENSE_REPORT,
            entity_id=report.id,
            user_id=current_user.id,
            user_role=current_user.profile.value if hasattr(current_user.profile, 'value') else str(current_user.profile),
            action=HistoryAction.APPROVED,
            from_status="ACCOUNTING_PENDING",
            to_status=report.status.value if hasattr(report.status, 'value') else str(report.status),
            comments=f"Accounting approval completed with SAP compensation: {compensation_data.sap_compensation_number} - {status_message}"
        ))
        
        db.commit()
        
        return AccountingApprovalResponse(
            success=True,
            message=f"Accounting approval completed successfully - {status_message}",
            report_id=report_id,
            step=4,
            sap_compensation_number=compensation_data.sap_compensation_number
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete accounting approval: {str(e)}"
        )


@router.get("/reports/{report_id}/accounting/state", response_model=AccountingApprovalState)
async def get_accounting_approval_state(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current accounting approval state for resume capability
    """
    # Check permissions
    if not (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for accounting operations"
        )
    
    report = db.query(TravelExpenseReport).options(
        joinedload(TravelExpenseReport.expenses)
    ).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Check if there are FACTURA expenses
    factura_expenses = [exp for exp in report.expenses if exp.document_type == DocumentType.FACTURA]
    
    # Determine current step and completed steps
    completed_steps = []
    
    if not factura_expenses:
        # No FACTURA expenses - skip to step 3 (compensation file generation)
        current_step = 3
        if report.sap_compensation_file:
            completed_steps.append(3)
            current_step = 4
        if report.sap_compensation_number:
            completed_steps.append(4)
    else:
        # Normal 4-step flow with FACTURA expenses
        current_step = 1
        
        if report.sap_expenses_file:
            completed_steps.append(1)
            current_step = 2
        
        # Check if SAP invoice numbers are set for FACTURA expenses
        if factura_expenses and all(exp.sap_invoice_number for exp in factura_expenses):
            completed_steps.append(2)
            current_step = 3
        
        if report.sap_compensation_file:
            completed_steps.append(3)
            current_step = 4
        
        if report.sap_compensation_number:
            completed_steps.append(4)
    
    # Get FACTURA expenses for UI
    factura_expenses_data = [
        {
            "id": exp.id,
            "category_name": exp.category.name if exp.category else "",
            "purpose": exp.purpose,
            "amount": float(exp.amount),
            "expense_date": exp.expense_date.isoformat(),
            "document_number": exp.document_number,
            "sap_invoice_number": exp.sap_invoice_number or ""
        }
        for exp in factura_expenses
    ]
    
    return AccountingApprovalState(
        report_id=report_id,
        step=current_step,
        sap_expenses_file=report.sap_expenses_file,
        sap_compensation_file=report.sap_compensation_file,
        sap_compensation_number=report.sap_compensation_number,
        factura_expenses=factura_expenses_data,
        completed_steps=completed_steps
    )


@router.get("/reports/{report_id}/sap-files/{file_type}")
async def download_sap_file(
    report_id: int,
    file_type: str,  # "expenses" or "compensation"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download SAP files (Accounting and Superuser only)
    """
    # Check permissions - only accounting users and superusers
    if not (current_user.is_superuser or 
            (current_user.is_approver and current_user.profile == UserProfile.ACCOUNTING)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to download SAP files"
        )
    
    report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense report not found"
        )
    
    # Get the appropriate file path
    if file_type == "expenses":
        file_path_relative = report.sap_expenses_file
        if not file_path_relative:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SAP expenses file not found for this report"
            )
    elif file_type == "compensation":
        file_path_relative = report.sap_compensation_file
        if not file_path_relative:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SAP compensation file not found for this report"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Use 'expenses' or 'compensation'"
        )
    
    # Get full file path
    file_path = SAPService.get_file_path(file_path_relative)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SAP file not found on disk"
        )
    
    # Extract filename
    filename = os.path.basename(file_path)
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='text/plain'
    )
