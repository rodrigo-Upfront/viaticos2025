"""
Expenses Router
Handles expense management operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.database.connection import get_db
from app.models.models import (
    User, Expense, ExpenseCategory, Country, Currency, FacturaSupplier, 
    TravelExpenseReport, Prepayment, ExpenseStatus, DocumentType, TaxableOption
)
from app.services.auth_service import AuthService, get_current_user, get_current_superuser
from app.schemas.expense_schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, 
    ExpenseList, ExpenseStatusUpdate
)

router = APIRouter()
auth_service = AuthService()


@router.get("/", response_model=ExpenseList)
async def get_expenses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search by purpose or document number"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    report_id: Optional[int] = Query(None, description="Filter by travel expense report ID"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    country_id: Optional[int] = Query(None, description="Filter by country ID"),
    start_date: Optional[str] = Query(None, description="Filter by expense_date from (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by expense_date to (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all expenses (filtered by user permissions)
    """
    query = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.country),
        joinedload(Expense.currency),
        joinedload(Expense.factura_supplier),
        joinedload(Expense.travel_expense_report)
    )
    
    # Filter by travel expense report if specified
    if report_id:
        query = query.filter(Expense.travel_expense_report_id == report_id)
    
    # Permission filtering for non-superusers
    if not current_user.is_superuser:
        # Join with TravelExpenseReport for permission checks
        query = query.outerjoin(TravelExpenseReport)
        
        # Base condition: users can see expenses from their own reports or expenses they created
        base_conditions = [
            TravelExpenseReport.requesting_user_id == current_user.id,
            Expense.created_by_user_id == current_user.id
        ]
        
        # Additional condition: approvers can see expenses from reports in their approval queue
        # when specifically filtering by report_id (i.e., when viewing a report for approval)
        if report_id and current_user.is_approver:
            from app.models.models import RequestStatus
            
            # Allow approvers to see expenses from reports that are in approval stages
            approval_conditions = TravelExpenseReport.status.in_([
                RequestStatus.SUPERVISOR_PENDING,
                RequestStatus.ACCOUNTING_PENDING, 
                RequestStatus.TREASURY_PENDING,
                RequestStatus.APPROVED_FOR_REIMBURSEMENT,
                RequestStatus.FUNDS_RETURN_PENDING,
                RequestStatus.REVIEW_RETURN
            ])
            base_conditions.append(approval_conditions)
        
        # Apply the combined filter
        from sqlalchemy import or_
        query = query.filter(or_(*base_conditions))
    
    # Apply search filter
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Expense.purpose.ilike(search_filter)) |
            (Expense.document_number.ilike(search_filter))
        )
    # Category filter
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    # Country filter
    if country_id:
        query = query.filter(Expense.country_id == country_id)
    # Date range filter
    try:
        if start_date:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Expense.expense_date >= sd)
        if end_date:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Expense.expense_date <= ed)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = ExpenseStatus(status_filter.upper())
            query = query.filter(Expense.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    expenses = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit).all()
    
    return ExpenseList(
        expenses=[ExpenseResponse.from_orm(expense) for expense in expenses],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/filter-options")
async def get_expense_filter_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get distinct filter options for expenses based on user's visible data
    """
    query = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.country),
        joinedload(Expense.currency),
        joinedload(Expense.travel_expense_report)
    )
    
    # Permission filtering for non-superusers (same logic as get_expenses)
    if not current_user.is_superuser:
        query = query.outerjoin(TravelExpenseReport)
        
        base_conditions = [
            TravelExpenseReport.requesting_user_id == current_user.id,
            Expense.created_by_user_id == current_user.id
        ]
        
        # Approvers can see expenses from reports in approval stages
        if current_user.is_approver:
            from app.models.models import RequestStatus
            approval_conditions = TravelExpenseReport.status.in_([
                RequestStatus.SUPERVISOR_PENDING,
                RequestStatus.ACCOUNTING_PENDING, 
                RequestStatus.TREASURY_PENDING,
                RequestStatus.APPROVED_FOR_REIMBURSEMENT,
                RequestStatus.FUNDS_RETURN_PENDING,
                RequestStatus.REVIEW_RETURN
            ])
            base_conditions.append(approval_conditions)
        
        from sqlalchemy import or_
        query = query.filter(or_(*base_conditions))
    
    expenses = query.all()
    
    # Extract distinct values
    distinct_statuses = list(set(e.status.value for e in expenses if e.status))
    
    # Use tuples for hashable sets, then convert back to dicts
    category_tuples = set((e.category.id, e.category.name) for e in expenses if e.category)
    distinct_categories = [{'id': cat_id, 'name': cat_name} for cat_id, cat_name in category_tuples]
    
    country_tuples = set((e.country.id, e.country.name) for e in expenses if e.country)
    distinct_countries = [{'id': country_id, 'name': country_name} for country_id, country_name in country_tuples]
    
    report_tuples = set()
    for e in expenses:
        if e.travel_expense_report:
            report = e.travel_expense_report
            # Get meaningful name based on report type
            if report.report_type and report.report_type.value == 'REIMBURSEMENT':
                name = getattr(report, 'reason', None) or f"Reimbursement Report #{report.id}"
            else:  # PREPAYMENT type
                name = (report.prepayment.reason if report.prepayment else None) or f"Prepayment Report #{report.id}"
            report_tuples.add((report.id, name))
    
    distinct_reports = [{'id': report_id, 'name': report_name} for report_id, report_name in report_tuples]
    
    # Sort lists
    distinct_categories = sorted(distinct_categories, key=lambda x: x['name'])
    distinct_countries = sorted(distinct_countries, key=lambda x: x['name'])
    distinct_reports = sorted(distinct_reports, key=lambda x: x['id'])
    
    return {
        "statuses": sorted(distinct_statuses),
        "categories": distinct_categories,
        "countries": distinct_countries,
        "reports": distinct_reports
    }


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific expense by ID
    """
    expense = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.country),
        joinedload(Expense.factura_supplier),
        joinedload(Expense.travel_expense_report)
    ).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        report = expense.travel_expense_report
        if report and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return ExpenseResponse.from_orm(expense)


@router.get("/{expense_id}/download/{file_name}")
async def download_expense_file(
    expense_id: int,
    file_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download an expense document file"""
    
    # Get the expense
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions - users can download their own files, or supervisors/admin can download any
    if not current_user.is_superuser:
        # Check if it's their own expense or if they have approval permissions
        can_access = False
        
        # If expense is linked to a travel expense report, check report permissions
        if expense.travel_expense_report:
            can_access = (expense.travel_expense_report.requesting_user_id == current_user.id or
                         current_user.is_approver)
        else:
            # For reimbursement expenses, check if user created it
            can_access = expense.created_by_user_id == current_user.id
        
        if not can_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to download this file"
            )
    
    # Verify the file matches the expense's document file
    if expense.document_file != file_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found for this expense"
        )
    
    # Construct file path (assuming files are stored in storage/uploads/expenses/)
    file_path = os.path.join("storage", "uploads", "expenses", file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type='application/octet-stream'
    )


@router.post("/{expense_id}/upload-file")
async def upload_expense_file(
    expense_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document file for an expense"""
    
    # Get the expense
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions - users can upload files for their own expenses, or admin can upload any
    if not current_user.is_superuser:
        # Check if it's their own expense or if they have approval permissions
        can_access = False
        
        # If expense is linked to a travel expense report, check report permissions
        if expense.travel_expense_report:
            can_access = expense.travel_expense_report.requesting_user_id == current_user.id
        else:
            # For reimbursement expenses, check if user created it
            can_access = expense.created_by_user_id == current_user.id
        
        if not can_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to upload file for this expense"
            )
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'}
    file_extension = os.path.splitext(file.filename or '')[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size too large. Maximum size is 10MB"
        )
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = "storage/uploads/expenses"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Update expense with new file
        expense.document_file = unique_filename
        expense.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "File uploaded successfully",
            "filename": unique_filename,
            "original_filename": file.filename
        }
        
    except Exception as e:
        # Clean up file if database update fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new expense
    """
    # Verify related entities exist
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense_data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    report = None
    if expense_data.travel_expense_report_id:
        report = db.query(TravelExpenseReport).filter(TravelExpenseReport.id == expense_data.travel_expense_report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel expense report not found")
    
    # Check permissions
    if report is not None:
        if not current_user.is_superuser and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to add expenses to this report"
            )
    
    # Verify factura supplier if provided and document type is Factura
    if expense_data.factura_supplier_id and expense_data.factura_supplier_id > 0:
        supplier = db.query(FacturaSupplier).filter(FacturaSupplier.id == expense_data.factura_supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura supplier not found")
    
    # Get country and currency from the travel expense report
    inherited_country_id = None
    inherited_currency_id = None
    if report is not None:
        report_with_details = db.query(TravelExpenseReport).options(
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.destination_country),
            joinedload(TravelExpenseReport.prepayment).joinedload(Prepayment.currency),
            joinedload(TravelExpenseReport.country),
            joinedload(TravelExpenseReport.currency)
        ).filter(TravelExpenseReport.id == expense_data.travel_expense_report_id).first()
        if not report_with_details:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Travel expense report not found")
        
        # Check if this is a prepayment-based report or reimbursement report
        if report_with_details.prepayment:
            # Prepayment-based report: inherit from prepayment
            inherited_country_id = report_with_details.prepayment.destination_country_id
            inherited_currency_id = report_with_details.prepayment.currency_id
            # Validate expense date within prepayment range
            if not (report_with_details.prepayment.start_date <= expense_data.expense_date <= report_with_details.prepayment.end_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Expense date must be within the report travel dates"
                )
        else:
            # Reimbursement report: use report's own country/currency
            inherited_country_id = report_with_details.country_id
            inherited_currency_id = report_with_details.currency_id
            # Validate expense date within reimbursement date range
            if report_with_details.start_date and report_with_details.end_date:
                if not (report_with_details.start_date <= expense_data.expense_date <= report_with_details.end_date):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Expense date must be within the report travel dates"
                    )
    
    try:
        # Build fields explicitly to avoid duplicate keyword errors
        payload = expense_data.model_dump()
        # Remove raw string enums that we will set as proper enums and status which we set manually
        payload.pop("document_type", None)
        payload.pop("taxable", None)
        payload.pop("status", None)  # Remove status if it exists in payload
        
        # Override country and currency with inherited values
        if report is not None:
            payload["country_id"] = inherited_country_id
            payload["currency_id"] = inherited_currency_id
        else:
            # Reimbursement: require explicit country and currency
            if not expense_data.country_id or not expense_data.currency_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="country_id and currency_id are required for reimbursements")
            payload["country_id"] = expense_data.country_id
            payload["currency_id"] = expense_data.currency_id
        
        # Handle factura_supplier_id for Boleta documents
        if expense_data.document_type.upper() == "BOLETA":
            payload["factura_supplier_id"] = None
        elif payload.get("factura_supplier_id") == 0:
            payload["factura_supplier_id"] = None

        expense = Expense(
            **payload,
            document_type=DocumentType(expense_data.document_type.upper()),
            taxable=TaxableOption(expense_data.taxable.upper()),
            status=ExpenseStatus.PENDING,
            created_by_user_id=None if report is not None else current_user.id
        )
        
        db.add(expense)
        db.commit()
        db.refresh(expense)
        
        # Load relationships for response
        expense = db.query(Expense).options(
            joinedload(Expense.category),
            joinedload(Expense.country),
            joinedload(Expense.currency),
            joinedload(Expense.factura_supplier)
        ).filter(Expense.id == expense.id).first()
        
        return ExpenseResponse.from_orm(expense)
        
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error creating expense: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create expense: {str(e)}"
        )


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an expense
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        report = expense.travel_expense_report
        if report and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        if expense.status != ExpenseStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only edit pending expenses"
            )
    
    try:
        # Update only provided fields
        update_data = expense_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "document_type" and value:
                setattr(expense, field, DocumentType(value.upper()))
            elif field == "taxable" and value:
                setattr(expense, field, TaxableOption(value.upper()))
            else:
                setattr(expense, field, value)
        # If report-linked, validate date within prepayment window (using possibly updated date)
        if expense.travel_expense_report_id:
            report_with_prepayment = db.query(TravelExpenseReport).options(
                joinedload(TravelExpenseReport.prepayment)
            ).filter(TravelExpenseReport.id == expense.travel_expense_report_id).first()
            if report_with_prepayment and report_with_prepayment.prepayment:
                if not (report_with_prepayment.prepayment.start_date <= expense.expense_date <= report_with_prepayment.prepayment.end_date):
                    db.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Expense date must be within the travel dates ({report_with_prepayment.prepayment.start_date} to {report_with_prepayment.prepayment.end_date})"
                    )
        
        expense.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(expense)
        
        # Load relationships for response
        expense = db.query(Expense).options(
            joinedload(Expense.category),
            joinedload(Expense.country),
            joinedload(Expense.currency),
            joinedload(Expense.factura_supplier)
        ).filter(Expense.id == expense.id).first()
        
        return ExpenseResponse.from_orm(expense)
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors) as-is
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update expense: {str(e)}"
        )


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an expense (users can delete their own pending expenses, superusers can delete any)
    """
    expense = db.query(Expense).options(
        joinedload(Expense.travel_expense_report)
    ).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Check permissions
    if not current_user.is_superuser:
        # Check if user owns the expense through the travel expense report
        report = expense.travel_expense_report
        if report and report.requesting_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this expense"
            )
        
        # Only allow deletion of pending expenses for regular users
        if expense.status != ExpenseStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete pending expenses"
            )
    
    try:
        db.delete(expense)
        db.commit()
        
        return {"message": "Expense deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete expense: {str(e)}"
        )

