"""
API endpoints for Credit Card Statement processing
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime

from app.database.connection import get_db
from app.services.auth_service import get_current_user
from app.models.models import User
from app.models.statement_models import CreditCardStatement, StatementTransaction, StatementStatus
from app.services.pdf_processor import process_statement_file
from app.schemas.statement_schemas import (
    StatementResponse, 
    StatementCreate, 
    StatementTransactionResponse,
    StatementTransactionCreate,
    StatementTransactionUpdate,
    StatementUploadResponse,
    StatementSummary
)

router = APIRouter(prefix="/statements", tags=["statements"])

# File upload configuration
UPLOAD_DIR = "/app/storage/statements"
ALLOWED_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def ensure_upload_dir():
    """Ensure upload directory exists"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=StatementUploadResponse)
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a credit card statement PDF for processing
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        ensure_upload_dir()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create statement record
        statement = CreditCardStatement(
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            uploaded_by_user_id=current_user.id,
            status=StatementStatus.PENDING
        )
        
        db.add(statement)
        db.commit()
        db.refresh(statement)
        
        # Schedule background processing
        background_tasks.add_task(process_statement_background, statement.id)
        
        return StatementUploadResponse(
            id=statement.id,
            filename=file.filename,
            file_size=file_size,
            status=statement.status.value,
            message="File uploaded successfully. Processing will begin shortly."
        )
        
    except Exception as e:
        # Cleanup file if database operation fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

def process_statement_background(statement_id: int):
    """Background task to process uploaded statement"""
    from app.database.connection import get_db
    db = next(get_db())
    
    try:
        statement = db.query(CreditCardStatement).filter(
            CreditCardStatement.id == statement_id
        ).first()
        
        if not statement:
            return
        
        # Process the PDF
        result = process_statement_file(statement.file_path)
        
        # Update statement with metadata
        metadata = result['metadata']
        statement.account_number = metadata.get('account_number')
        
        if metadata.get('period_start'):
            try:
                statement.statement_period_start = datetime.strptime(
                    metadata['period_start'], '%d %b %Y'
                )
            except ValueError:
                pass
        
        if metadata.get('period_end'):
            try:
                statement.statement_period_end = datetime.strptime(
                    metadata['period_end'], '%d %b %Y'
                )
            except ValueError:
                pass
        
        # Update totals
        summary = result['summary']
        statement.total_transactions = summary['total_transactions']
        statement.total_amount_local = summary.get('total_local')
        statement.total_amount_usd = summary.get('total_usd')
        
        # Create transaction records
        for transaction_data in result['transactions']:
            transaction = StatementTransaction(
                statement_id=statement.id,
                transaction_date=datetime.strptime(transaction_data['fecha'], '%d/%m/%Y'),
                document_number=transaction_data['comprobante'],
                description=transaction_data['detalle'],
                amount_local=transaction_data.get('monto_local'),
                amount_usd=transaction_data.get('monto_usd')
            )
            db.add(transaction)
        
        statement.status = StatementStatus.PROCESSED
        statement.processed_at = datetime.utcnow()
        statement.processing_notes = f"Successfully processed {len(result['transactions'])} transactions"
        
        db.commit()
        
    except Exception as e:
        # Update statement with error
        statement.status = StatementStatus.REJECTED
        statement.processing_notes = f"Processing failed: {str(e)}"
        db.commit()

@router.get("/", response_model=List[StatementResponse])
def get_statements(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's uploaded statements"""
    query = db.query(CreditCardStatement).filter(
        CreditCardStatement.uploaded_by_user_id == current_user.id
    )
    
    if status:
        try:
            status_enum = StatementStatus(status.upper())
            query = query.filter(CreditCardStatement.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    statements = query.offset(skip).limit(limit).all()
    return statements

@router.get("/{statement_id}", response_model=StatementResponse)
def get_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific statement"""
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    return statement

@router.get("/{statement_id}/transactions", response_model=List[StatementTransactionResponse])
def get_statement_transactions(
    statement_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get transactions for a specific statement"""
    # Verify user owns the statement
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    transactions = db.query(StatementTransaction).filter(
        StatementTransaction.statement_id == statement_id
    ).offset(skip).limit(limit).all()
    
    return transactions

@router.get("/{statement_id}/summary", response_model=StatementSummary)
def get_statement_summary(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for a statement"""
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    transactions = db.query(StatementTransaction).filter(
        StatementTransaction.statement_id == statement_id
    ).all()
    
    # Calculate statistics
    total_transactions = len(transactions)
    matched_transactions = 0  # No matching yet - just upload and read
    total_local = sum(t.amount_local or 0 for t in transactions)
    total_usd = sum(t.amount_usd or 0 for t in transactions)
    
    return StatementSummary(
        statement_id=statement_id,
        total_transactions=total_transactions,
        matched_transactions=matched_transactions,
        unmatched_transactions=total_transactions - matched_transactions,
        total_amount_local=total_local,
        total_amount_usd=total_usd,
        match_percentage=round((matched_transactions / total_transactions * 100) if total_transactions > 0 else 0, 2)
    )

@router.delete("/{statement_id}")
def delete_statement(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a statement and its transactions"""
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Delete file
    try:
        if os.path.exists(statement.file_path):
            os.remove(statement.file_path)
    except Exception:
        pass  # Continue even if file deletion fails
    
    # Delete from database (transactions will be deleted via cascade)
    db.delete(statement)
    db.commit()
    
    return {"message": "Statement deleted successfully"}

@router.post("/{statement_id}/reprocess")
def reprocess_statement(
    statement_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocess a statement (useful after fixing processing logic)"""
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Clear existing transactions
    db.query(StatementTransaction).filter(
        StatementTransaction.statement_id == statement_id
    ).delete()
    
    # Reset statement status
    statement.status = StatementStatus.PENDING
    statement.processing_notes = "Reprocessing requested"
    statement.processed_at = None
    
    db.commit()
    
    # Schedule reprocessing
    background_tasks.add_task(process_statement_background, statement_id)
    
    return {"message": "Statement reprocessing started"}

@router.put("/{statement_id}/transactions/{transaction_id}")
def update_transaction(
    statement_id: int,
    transaction_id: int,
    transaction_update: StatementTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific transaction in a statement"""
    # Verify the statement belongs to the user
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Get the transaction
    transaction = db.query(StatementTransaction).filter(
        StatementTransaction.id == transaction_id,
        StatementTransaction.statement_id == statement_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction fields
    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    # Update statement's updated_at timestamp
    statement.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update transaction: {str(e)}")

@router.delete("/{statement_id}/transactions/{transaction_id}")
def delete_transaction(
    statement_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific transaction from a statement"""
    # Verify the statement belongs to the user
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Get the transaction
    transaction = db.query(StatementTransaction).filter(
        StatementTransaction.id == transaction_id,
        StatementTransaction.statement_id == statement_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Delete the transaction
    db.delete(transaction)
    
    # Update transaction count
    statement.total_transactions = db.query(StatementTransaction).filter(
        StatementTransaction.statement_id == statement_id
    ).count() - 1
    
    # Update statement's updated_at timestamp
    statement.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        return {"message": "Transaction deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete transaction: {str(e)}")

@router.post("/{statement_id}/transactions")
def add_transaction(
    statement_id: int,
    transaction_data: StatementTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new transaction to a statement"""
    # Verify the statement belongs to the user
    statement = db.query(CreditCardStatement).filter(
        CreditCardStatement.id == statement_id,
        CreditCardStatement.uploaded_by_user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Create new transaction
    transaction = StatementTransaction(
        statement_id=statement_id,
        **transaction_data.dict()
    )
    
    db.add(transaction)
    
    # Update transaction count
    statement.total_transactions += 1
    statement.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to add transaction: {str(e)}")
