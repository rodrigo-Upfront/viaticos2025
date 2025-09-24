"""
Credit Card Statement API endpoints
"""

import os
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database.connection import get_db
from app.models.models import (
    User, CreditCardStatement, CreditCardTransaction, 
    CreditCardConsolidatedExpense, Currency, Country, UserProfile
)
from app.schemas.credit_card_schemas import (
    CreditCardStatementCreate, CreditCardStatementResponse, CreditCardStatementList,
    CreditCardUploadResponse, CreditCardProcessingRequest, CreditCardProcessingResponse,
    UserCurrencyCombination, PrepaymentFormData, CreditCardDashboardStats,
    CreditCardTransactionResponse, CreditCardConsolidatedExpenseResponse
)
from app.services.credit_card_service import CreditCardService
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/credit-card-statements", tags=["Credit Card Statements"])


@router.post("/upload", response_model=CreditCardUploadResponse)
async def upload_credit_card_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a credit card statement CSV file
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    # Check file size (10MB limit)
    file_size = 0
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create upload directory if it doesn't exist
        upload_dir = "uploads/credit_card_statements"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Create statement record
        statement = CreditCardStatement(
            filename=unique_filename,
            original_filename=file.filename,
            uploaded_by_user_id=current_user.id,
            status="UPLOADED"
        )
        
        db.add(statement)
        db.commit()
        db.refresh(statement)
        
        # Process the CSV file
        processing_result = CreditCardService.process_csv_file(file_path, statement.id, db)
        
        # Consolidate transactions
        if processing_result['processed_records'] > 0:
            consolidated_ids = CreditCardService.consolidate_transactions(statement.id, db)
        
        # Get user-currency combinations for the form
        user_currency_combinations = CreditCardService.get_user_currency_combinations(statement.id, db)
        
        return CreditCardUploadResponse(
            statement_id=statement.id,
            filename=statement.filename,
            total_records=processing_result['total_records'],
            validation_errors=processing_result.get('validation_errors'),
            user_currency_combinations=[combo.dict() for combo in user_currency_combinations]
        )
        
    except Exception as e:
        # Clean up file if it was created
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}"
        )


@router.post("/{statement_id}/process", response_model=CreditCardProcessingResponse)
async def process_credit_card_statement(
    statement_id: int,
    request_data: CreditCardProcessingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process uploaded credit card statement and create prepayments
    """
    # Verify statement exists and user has access
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    # Only superuser or the uploader can process
    if not current_user.is_superuser and statement.uploaded_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to process this statement"
        )
    
    if statement.status not in ['PROCESSED', 'VALIDATION_ERRORS']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Statement must be processed before creating prepayments"
        )
    
    try:
        # Create prepayments and expenses
        result = CreditCardService.create_prepayments_and_expenses(
            statement_id, 
            request_data.prepayment_data, 
            db
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process statement: {str(e)}"
        )


@router.get("/", response_model=CreditCardStatementList)
async def list_credit_card_statements(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List credit card statements
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    # Build query - treasury and superusers can see all statements
    query = db.query(CreditCardStatement).options(
        joinedload(CreditCardStatement.uploaded_by)
    )
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    statements = query.order_by(desc(CreditCardStatement.created_at)).offset(skip).limit(limit).all()
    
    # Build response with additional data
    statement_responses = []
    for statement in statements:
        # Count transactions and consolidated expenses
        transaction_count = db.query(CreditCardTransaction).filter(
            CreditCardTransaction.statement_id == statement.id
        ).count()
        
        consolidated_count = db.query(CreditCardConsolidatedExpense).filter(
            CreditCardConsolidatedExpense.statement_id == statement.id
        ).count()
        
        response = CreditCardStatementResponse(
            id=statement.id,
            filename=statement.filename,
            original_filename=statement.original_filename,
            upload_date=statement.upload_date,
            uploaded_by_user_id=statement.uploaded_by_user_id,
            status=statement.status,
            total_records=statement.total_records,
            processed_records=statement.processed_records,
            validation_errors=statement.validation_errors,
            created_at=statement.created_at,
            updated_at=statement.updated_at,
            uploaded_by_name=f"{statement.uploaded_by.name} {statement.uploaded_by.surname}" if statement.uploaded_by else None,
            transaction_count=transaction_count,
            consolidated_expense_count=consolidated_count
        )
        
        statement_responses.append(response)
    
    return CreditCardStatementList(
        statements=statement_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{statement_id}", response_model=CreditCardStatementResponse)
async def get_credit_card_statement(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get credit card statement details
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    statement = db.query(CreditCardStatement).options(
        joinedload(CreditCardStatement.uploaded_by)
    ).filter(CreditCardStatement.id == statement_id).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    # Count related records
    transaction_count = db.query(CreditCardTransaction).filter(
        CreditCardTransaction.statement_id == statement.id
    ).count()
    
    consolidated_count = db.query(CreditCardConsolidatedExpense).filter(
        CreditCardConsolidatedExpense.statement_id == statement.id
    ).count()
    
    return CreditCardStatementResponse(
        id=statement.id,
        filename=statement.filename,
        original_filename=statement.original_filename,
        upload_date=statement.upload_date,
        uploaded_by_user_id=statement.uploaded_by_user_id,
        status=statement.status,
        total_records=statement.total_records,
        processed_records=statement.processed_records,
        validation_errors=statement.validation_errors,
        created_at=statement.created_at,
        updated_at=statement.updated_at,
        uploaded_by_name=f"{statement.uploaded_by.name} {statement.uploaded_by.surname}" if statement.uploaded_by else None,
        transaction_count=transaction_count,
        consolidated_expense_count=consolidated_count
    )


@router.get("/{statement_id}/user-currency-combinations", response_model=List[UserCurrencyCombination])
async def get_user_currency_combinations(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user-currency combinations for prepayment form
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    combinations = CreditCardService.get_user_currency_combinations(statement_id, db)
    return combinations


@router.get("/{statement_id}/transactions", response_model=List[CreditCardTransactionResponse])
async def get_statement_transactions(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get transactions for a credit card statement
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    transactions = db.query(CreditCardTransaction).filter(
        CreditCardTransaction.statement_id == statement_id
    ).all()
    
    response_transactions = []
    for transaction in transactions:
        # Get related data manually to avoid relationship issues
        matched_user = db.query(User).filter(User.id == transaction.matched_user_id).first() if transaction.matched_user_id else None
        
        response = CreditCardTransactionResponse(
            id=transaction.id,
            credit_card_number=transaction.credit_card_number,
            transaction_type=transaction.transaction_type,
            currency_code=transaction.currency_code,
            amount=transaction.amount,
            transaction_date=transaction.transaction_date,
            merchant=transaction.merchant,
            description=transaction.description,
            statement_id=transaction.statement_id,
            matched_user_id=transaction.matched_user_id,
            consolidated_expense_id=transaction.consolidated_expense_id,
            status=transaction.status,
            created_at=transaction.created_at,
            matched_user_name=f"{matched_user.name} {matched_user.surname}" if matched_user else None,
            consolidated_expense_description=None  # Simplified for now
        )
        response_transactions.append(response)
    
    return response_transactions


@router.get("/{statement_id}/consolidated-expenses", response_model=List[CreditCardConsolidatedExpenseResponse])
async def get_statement_consolidated_expenses(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get consolidated expenses for a credit card statement
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    consolidated_expenses = db.query(CreditCardConsolidatedExpense).filter(
        CreditCardConsolidatedExpense.statement_id == statement_id
    ).all()
    
    response_expenses = []
    for expense in consolidated_expenses:
        # Get related data manually to avoid relationship issues
        matched_user = db.query(User).filter(User.id == expense.matched_user_id).first() if expense.matched_user_id else None
        prepayment_reason = None
        if expense.associated_prepayment_id:
            from app.models.models import Prepayment
            prepayment = db.query(Prepayment).filter(Prepayment.id == expense.associated_prepayment_id).first()
            prepayment_reason = prepayment.reason if prepayment else None
        
        response = CreditCardConsolidatedExpenseResponse(
            id=expense.id,
            statement_id=expense.statement_id,
            credit_card_number=expense.credit_card_number,
            currency_code=expense.currency_code,
            total_amount=expense.total_amount,
            expense_date=expense.expense_date,
            expense_description=expense.expense_description,
            supplier_name=expense.supplier_name,
            transaction_count=expense.transaction_count,
            source_transaction_ids=expense.source_transaction_ids,
            matched_user_id=expense.matched_user_id,
            associated_prepayment_id=expense.associated_prepayment_id,
            created_expense_id=expense.created_expense_id,
            status=expense.status,
            created_at=expense.created_at,
            matched_user_name=f"{matched_user.name} {matched_user.surname}" if matched_user else None,
            associated_prepayment_reason=prepayment_reason,
            created_expense_purpose=None  # Simplified for now
        )
        response_expenses.append(response)
    
    return response_expenses


@router.get("/dashboard/stats", response_model=CreditCardDashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for credit card statements
    """
    # Check if user has access to credit card statements
    if not (current_user.is_superuser or current_user.profile == UserProfile.TREASURY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to credit card statements is restricted to treasury and superusers"
        )
    
    # Build query - treasury and superusers can see all statements
    base_query = db.query(CreditCardStatement)
    
    # Get statistics
    total_statements = base_query.count()
    pending_processing = base_query.filter(CreditCardStatement.status.in_(['UPLOADED', 'VALIDATION_ERRORS'])).count()
    completed_processing = base_query.filter(CreditCardStatement.status == 'COMPLETED').count()
    
    # Get transaction and expense counts
    statement_ids = [s.id for s in base_query.all()]
    
    total_transactions = 0
    total_consolidated_expenses = 0
    total_created_prepayments = 0
    
    if statement_ids:
        total_transactions = db.query(CreditCardTransaction).filter(
            CreditCardTransaction.statement_id.in_(statement_ids)
        ).count()
        
        total_consolidated_expenses = db.query(CreditCardConsolidatedExpense).filter(
            CreditCardConsolidatedExpense.statement_id.in_(statement_ids)
        ).count()
        
        total_created_prepayments = db.query(CreditCardConsolidatedExpense).filter(
            CreditCardConsolidatedExpense.statement_id.in_(statement_ids),
            CreditCardConsolidatedExpense.associated_prepayment_id.isnot(None)
        ).count()
    
    # Get recent statements
    recent_statements = base_query.options(
        joinedload(CreditCardStatement.uploaded_by)
    ).order_by(desc(CreditCardStatement.created_at)).limit(5).all()
    
    recent_responses = []
    for statement in recent_statements:
        response = CreditCardStatementResponse(
            id=statement.id,
            filename=statement.filename,
            original_filename=statement.original_filename,
            upload_date=statement.upload_date,
            uploaded_by_user_id=statement.uploaded_by_user_id,
            status=statement.status,
            total_records=statement.total_records,
            processed_records=statement.processed_records,
            validation_errors=statement.validation_errors,
            created_at=statement.created_at,
            updated_at=statement.updated_at,
            uploaded_by_name=f"{statement.uploaded_by.name} {statement.uploaded_by.surname}" if statement.uploaded_by else None
        )
        recent_responses.append(response)
    
    return CreditCardDashboardStats(
        total_statements=total_statements,
        pending_processing=pending_processing,
        completed_processing=completed_processing,
        total_transactions=total_transactions,
        total_consolidated_expenses=total_consolidated_expenses,
        total_created_prepayments=total_created_prepayments,
        recent_statements=recent_responses
    )


@router.delete("/{statement_id}")
async def delete_credit_card_statement(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a credit card statement and all related data
    """
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Statement not found")
    
    # Check permissions (only superuser or uploader can delete)
    if not current_user.is_superuser and statement.uploaded_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this statement"
        )
    
    # Check if statement has associated prepayments
    has_prepayments = db.query(CreditCardConsolidatedExpense).filter(
        CreditCardConsolidatedExpense.statement_id == statement_id,
        CreditCardConsolidatedExpense.associated_prepayment_id.isnot(None)
    ).count() > 0
    
    if has_prepayments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete statement that has associated prepayments"
        )
    
    try:
        # Delete related records first (in correct order due to foreign keys)
        # Delete transactions first (they reference consolidated expenses)
        db.query(CreditCardTransaction).filter(
            CreditCardTransaction.statement_id == statement_id
        ).delete()
        
        # Delete consolidated expenses after transactions
        db.query(CreditCardConsolidatedExpense).filter(
            CreditCardConsolidatedExpense.statement_id == statement_id
        ).delete()
        
        # Delete file from filesystem
        file_path = os.path.join("uploads/credit_card_statements", statement.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete statement
        db.delete(statement)
        db.commit()
        
        return {"message": "Statement deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete statement: {str(e)}"
        )
