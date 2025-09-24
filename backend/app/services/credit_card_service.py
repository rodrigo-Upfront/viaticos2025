"""
Credit Card Statement Processing Service
Handles CSV upload, parsing, user matching, and transaction consolidation
"""

import pandas as pd
import os
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.models import (
    CreditCardStatement, CreditCardTransaction, CreditCardConsolidatedExpense,
    User, Currency, Country, Prepayment, Expense, ExpenseCategory,
    DocumentType, TaxableOption, ExpenseStatus, RequestStatus
)
from app.schemas.credit_card_schemas import (
    CreditCardUploadResponse, UserCurrencyCombination, 
    CreditCardProcessingResponse
)


class CreditCardService:
    
    @staticmethod
    def process_csv_file(file_path: str, statement_id: int, db: Session) -> Dict[str, Any]:
        """
        Process uploaded CSV file and extract transactions
        Returns processing results with validation errors
        """
        try:
            # Read CSV file, skip first row as per requirement
            df = pd.read_csv(file_path, skiprows=1, header=None)
            
            # Replace NaN values with None for JSON serialization
            df = df.where(pd.notna(df), None)
            
            # Define column names based on CSV structure
            column_names = [
                'codigo_banco', 'codigo_empresa', 'codigo_planta', 'centro_costos',
                'fecha_periodo', 'codigo_sucursal', 'grupo_afinidad', 'numero_cuenta',
                'id_empleado', 'numero_tarjeta', 'denominacion', 'tipo_transaccion',
                'origen_transaccion', 'moneda_origen', 'importe_origen',
                'fecha_origen_transaccion', 'establecimiento', 'numero_cupon',
                'moneda', 'cartera', 'importe_transaccion', 'ciudad_consumo',
                'codigo_rubro', 'descripcion_rubro', 'nro_autorizacion'
            ]
            
            df.columns = column_names
            
            # Filter out negative amounts (payments)
            df = df[df['importe_transaccion'] > 0]
            
            total_records = len(df)
            processed_records = 0
            validation_errors = {}
            
            # Get all users with credit card numbers for matching
            users_dict = CreditCardService._get_users_credit_card_mapping(db)
            
            # Get all currencies for validation
            currencies = {curr.code: curr.id for curr in db.query(Currency).all()}
            
            transactions = []
            unmatched_cards = {}  # Dict to count occurrences: {card_number: count}
            missing_currencies = {}  # Dict to count occurrences: {currency: count}
            
            for index, row in df.iterrows():
                try:
                    # Only validate truly required columns (many columns can be empty)
                    if pd.isna(row['numero_cuenta']) or str(row['numero_cuenta']).strip() == '':
                        validation_errors[f'row_{index + 2}_account'] = f"Row {index + 2}: Missing account number"
                        continue
                    
                    if pd.isna(row['importe_transaccion']):
                        validation_errors[f'row_{index + 2}_amount'] = f"Row {index + 2}: Missing transaction amount"
                        continue
                    
                    # Clean account number (remove spaces) - this is the user's credit card number
                    card_number = str(row['numero_cuenta']).replace(' ', '')
                    if card_number == 'nan' or card_number == '':
                        validation_errors[f'row_{index + 2}_account'] = f"Row {index + 2}: Invalid account number in column 'numero_cuenta'"
                        continue
                    
                    # Match user by account number (this matches user's credit card number)
                    matched_user_id = users_dict.get(card_number)
                    if not matched_user_id:
                        card_display = str(row['numero_cuenta'])  # Show account number, not card number
                        unmatched_cards[card_display] = unmatched_cards.get(card_display, 0) + 1
                        continue
                    
                    # Validate currency - use 'moneda' column, fallback to 'moneda_origen' if 'LOC'
                    currency_source = row['moneda'] if row['moneda'] != 'LOC' else row['moneda_origen']
                    currency_code = CreditCardService._map_currency_code(currency_source)
                    if currency_code not in currencies:
                        missing_currencies[currency_code] = missing_currencies.get(currency_code, 0) + 1
                        continue
                    
                    # Validate amount is positive number
                    try:
                        amount = Decimal(str(row['importe_transaccion']))
                        if amount <= 0:
                            continue  # Skip negative amounts as per requirement
                    except (ValueError, TypeError):
                        validation_errors[f'row_{index + 2}_amount'] = f"Row {index + 2}: Invalid amount '{row['importe_transaccion']}' in column 'importe_transaccion'"
                        continue
                    
                    # Validate date
                    try:
                        transaction_date = pd.to_datetime(row['fecha_origen_transaccion']).date()
                    except (ValueError, TypeError):
                        validation_errors[f'row_{index + 2}_date'] = f"Row {index + 2}: Invalid date '{row['fecha_origen_transaccion']}' in column 'fecha_origen_transaccion'"
                        continue
                    
                    # Create transaction record
                    # Convert row to dict and handle NaN values
                    raw_data = row.to_dict()
                    # Convert NaN values to None for JSON serialization
                    raw_data = {k: (None if pd.isna(v) else v) for k, v in raw_data.items()}
                    
                    transaction = CreditCardTransaction(
                        statement_id=statement_id,
                        credit_card_number=card_number,  # Store the account number as credit_card_number
                        transaction_type=row['tipo_transaccion'],
                        currency_code=currency_code,
                        amount=amount,
                        transaction_date=transaction_date,
                        merchant=row['establecimiento'] if not pd.isna(row['establecimiento']) else None,
                        description=row['descripcion_rubro'] if not pd.isna(row['descripcion_rubro']) else None,
                        raw_data=raw_data,
                        matched_user_id=matched_user_id,
                        status='MATCHED'
                    )
                    
                    transactions.append(transaction)
                    processed_records += 1
                    
                except Exception as e:
                    validation_errors[f'row_{index + 2}_error'] = f"Row {index + 2}: {str(e)}"
            
            # Bulk insert transactions
            if transactions:
                db.add_all(transactions)
                db.flush()  # Get IDs without committing
            
            # Collect validation errors with counts
            if unmatched_cards:
                validation_errors['unmatched_credit_cards'] = [
                    f"{card} ({count} records)" for card, count in unmatched_cards.items()
                ]
            if missing_currencies:
                validation_errors['missing_currencies'] = [
                    f"{currency} ({count} records)" for currency, count in missing_currencies.items()
                ]
            
            # Update statement with results
            statement = db.query(CreditCardStatement).filter(
                CreditCardStatement.id == statement_id
            ).first()
            
            if statement:
                statement.total_records = total_records
                statement.processed_records = processed_records
                statement.validation_errors = validation_errors if validation_errors else None
                statement.status = 'PROCESSED' if not validation_errors else 'VALIDATION_ERRORS'
                statement.updated_at = datetime.utcnow()
            
            db.commit()
            
            return {
                'total_records': total_records,
                'processed_records': processed_records,
                'validation_errors': validation_errors,
                'transaction_ids': [t.id for t in transactions]
            }
            
        except Exception as e:
            db.rollback()
            raise Exception(f"Error processing CSV file: {str(e)}")
    
    @staticmethod
    def consolidate_transactions(statement_id: int, db: Session) -> List[int]:
        """
        Consolidate CARGO ACUM.CPRA.EXTERIOR transactions by user+currency
        Returns list of consolidated expense IDs
        """
        # Get all transactions for the statement
        transactions = db.query(CreditCardTransaction).filter(
            CreditCardTransaction.statement_id == statement_id,
            CreditCardTransaction.status == 'MATCHED'
        ).all()
        
        # Separate CARGO and regular transactions
        cargo_transactions = [t for t in transactions if t.transaction_type == 'CARGO ACUM.CPRA.EXTERIOR']
        regular_transactions = [t for t in transactions if t.transaction_type != 'CARGO ACUM.CPRA.EXTERIOR']
        
        consolidated_expense_ids = []
        
        # Consolidate CARGO transactions by user+currency
        cargo_groups = {}
        for transaction in cargo_transactions:
            key = (transaction.matched_user_id, transaction.currency_code)
            if key not in cargo_groups:
                cargo_groups[key] = []
            cargo_groups[key].append(transaction)
        
        # Create consolidated CARGO expenses
        for (user_id, currency_code), group_transactions in cargo_groups.items():
            total_amount = sum(t.amount for t in group_transactions)
            max_date = max(t.transaction_date for t in group_transactions)
            
            consolidated_expense = CreditCardConsolidatedExpense(
                statement_id=statement_id,
                credit_card_number=group_transactions[0].credit_card_number,
                currency_code=currency_code,
                total_amount=total_amount,
                expense_date=max_date,
                expense_description='CARGO ACUM.CPRA.EXTERIOR',
                supplier_name='COMPRA EXTERIOR FEES',
                transaction_count=len(group_transactions),
                source_transaction_ids=[t.id for t in group_transactions],
                matched_user_id=user_id,
                status='PENDING'
            )
            
            db.add(consolidated_expense)
            db.flush()  # Get ID
            
            # Update source transactions
            for transaction in group_transactions:
                transaction.consolidated_expense_id = consolidated_expense.id
                transaction.status = 'CONSOLIDATED'
            
            consolidated_expense_ids.append(consolidated_expense.id)
        
        # Create individual consolidated expenses for regular transactions
        for transaction in regular_transactions:
            consolidated_expense = CreditCardConsolidatedExpense(
                statement_id=statement_id,
                credit_card_number=transaction.credit_card_number,
                currency_code=transaction.currency_code,
                total_amount=transaction.amount,
                expense_date=transaction.transaction_date,
                expense_description=transaction.description or 'Credit Card Transaction',
                supplier_name=transaction.merchant or 'Unknown Merchant',
                transaction_count=1,
                source_transaction_ids=[transaction.id],
                matched_user_id=transaction.matched_user_id,
                status='PENDING'
            )
            
            db.add(consolidated_expense)
            db.flush()  # Get ID
            
            # Update source transaction - regular transactions are PROCESSED, not CONSOLIDATED
            transaction.consolidated_expense_id = consolidated_expense.id
            transaction.status = 'PROCESSED'  # Individual transactions are PROCESSED
            
            consolidated_expense_ids.append(consolidated_expense.id)
        
        db.commit()
        return consolidated_expense_ids
    
    @staticmethod
    def get_user_currency_combinations(statement_id: int, db: Session) -> List[UserCurrencyCombination]:
        """
        Get user-currency combinations for prepayment form
        """
        # Get consolidated expenses grouped by user+currency
        consolidated_expenses = db.query(CreditCardConsolidatedExpense).filter(
            CreditCardConsolidatedExpense.statement_id == statement_id,
            CreditCardConsolidatedExpense.status == 'PENDING'
        ).all()
        
        # Group by user+currency
        combinations = {}
        for expense in consolidated_expenses:
            key = (expense.matched_user_id, expense.currency_code)
            if key not in combinations:
                user = db.query(User).filter(User.id == expense.matched_user_id).first()
                currency = db.query(Currency).filter(Currency.code == expense.currency_code).first()
                
                combinations[key] = {
                    'user_id': expense.matched_user_id,
                    'user_name': f"{user.name} {user.surname}" if user else "Unknown User",
                    'credit_card_number': expense.credit_card_number,
                    'currency_code': expense.currency_code,
                    'currency_name': currency.name if currency else expense.currency_code,
                    'transaction_count': 0,
                    'total_amount': Decimal('0'),
                    'consolidated_expenses': []
                }
            
            combinations[key]['transaction_count'] += expense.transaction_count
            combinations[key]['total_amount'] += expense.total_amount
            combinations[key]['consolidated_expenses'].append(expense)
        
        return [UserCurrencyCombination(**data) for data in combinations.values()]
    
    @staticmethod
    def create_prepayments_and_expenses(
        statement_id: int, 
        prepayment_forms: List[Dict[str, Any]], 
        db: Session
    ) -> CreditCardProcessingResponse:
        """
        Create prepayments and expenses from consolidated transactions
        """
        created_prepayments = []
        created_expenses = []
        processing_summary = {}
        
        try:
            for form_data in prepayment_forms:
                user_id = form_data['user_id']
                currency_code = form_data['currency_code']
                
                # Get currency and country
                currency = db.query(Currency).filter(Currency.code == currency_code).first()
                country = db.query(Country).filter(Country.id == form_data['country_id']).first()
                
                if not currency or not country:
                    continue
                
                # Get consolidated expenses for this user+currency
                consolidated_expenses = db.query(CreditCardConsolidatedExpense).filter(
                    and_(
                        CreditCardConsolidatedExpense.statement_id == statement_id,
                        CreditCardConsolidatedExpense.matched_user_id == user_id,
                        CreditCardConsolidatedExpense.currency_code == currency_code,
                        CreditCardConsolidatedExpense.status == 'PENDING'
                    )
                ).all()
                
                if not consolidated_expenses:
                    continue
                
                # Calculate total amount
                total_amount = sum(exp.total_amount for exp in consolidated_expenses)
                
                # Create prepayment with TREASURY_PENDING status for credit card imports
                prepayment = Prepayment(
                    reason=form_data['reason'],
                    destination_country_id=form_data['country_id'],
                    start_date=form_data['start_date'],
                    end_date=form_data['end_date'],
                    currency_id=currency.id,
                    amount=total_amount,
                    comment=form_data.get('comment'),
                    requesting_user_id=user_id,
                    status=RequestStatus.TREASURY_PENDING  # Skip supervisor/accounting approval
                )
                
                db.add(prepayment)
                db.flush()  # Get prepayment ID
                
                # Update consolidated expenses
                for consolidated_expense in consolidated_expenses:
                    consolidated_expense.associated_prepayment_id = prepayment.id
                    consolidated_expense.status = 'PREPAYMENT_CREATED'
                
                created_prepayments.append(prepayment.id)
                
                # Create expense report (this will be done when prepayment is approved)
                # For now, just track the consolidated expenses
                
            db.commit()
            
            processing_summary = {
                'total_prepayments': len(created_prepayments),
                'total_expenses': len(created_expenses),
                'status': 'SUCCESS'
            }
            
            # Update statement status
            statement = db.query(CreditCardStatement).filter(
                CreditCardStatement.id == statement_id
            ).first()
            
            if statement:
                statement.status = 'COMPLETED'
                statement.updated_at = datetime.utcnow()
                db.commit()
            
            return CreditCardProcessingResponse(
                statement_id=statement_id,
                created_prepayments=created_prepayments,
                created_expenses=created_expenses,
                processing_summary=processing_summary
            )
            
        except Exception as e:
            db.rollback()
            raise Exception(f"Error creating prepayments and expenses: {str(e)}")
    
    @staticmethod
    def create_expenses_from_consolidated(
        consolidated_expense_ids: List[int], 
        travel_expense_report_id: int,
        db: Session
    ) -> List[int]:
        """
        Create expenses from consolidated credit card expenses when report is created
        """
        created_expense_ids = []
        
        try:
            for consolidated_id in consolidated_expense_ids:
                consolidated_expense = db.query(CreditCardConsolidatedExpense).filter(
                    CreditCardConsolidatedExpense.id == consolidated_id
                ).first()
                
                if not consolidated_expense:
                    continue
                
                # Get currency and country from the report
                from app.models.models import TravelExpenseReport
                report = db.query(TravelExpenseReport).filter(
                    TravelExpenseReport.id == travel_expense_report_id
                ).first()
                
                if not report or not report.prepayment:
                    continue
                
                # Create expense with minimal required fields
                # Inherit country and currency from report (which inherits from prepayment)
                expense_country_id = report.country_id or report.prepayment.destination_country_id
                expense_currency_id = report.currency_id or report.prepayment.currency_id
                
                expense = Expense(
                    category_id=None,  # Will be filled by user
                    travel_expense_report_id=travel_expense_report_id,
                    purpose=consolidated_expense.expense_description,
                    document_type=DocumentType.BOLETA,  # Credit card transactions are BOLETA
                    boleta_supplier=consolidated_expense.supplier_name,
                    expense_date=consolidated_expense.expense_date,
                    country_id=expense_country_id,
                    currency_id=expense_currency_id,
                    amount=consolidated_expense.total_amount,
                    document_number='',  # Will be filled by user
                    taxable=TaxableOption.NO,
                    import_source='CREDIT_CARD',
                    credit_card_expense_id=consolidated_expense.id,
                    status=ExpenseStatus.PENDING
                )
                
                db.add(expense)
                db.flush()  # Get expense ID
                
                # Update consolidated expense
                consolidated_expense.created_expense_id = expense.id
                consolidated_expense.status = 'EXPENSE_CREATED'
                
                created_expense_ids.append(expense.id)
            
            db.commit()
            return created_expense_ids
            
        except Exception as e:
            db.rollback()
            raise Exception(f"Error creating expenses from consolidated: {str(e)}")
    
    @staticmethod
    def _get_users_credit_card_mapping(db: Session) -> Dict[str, int]:
        """Get mapping of credit card numbers to user IDs"""
        users = db.query(User).filter(User.credit_card_number.isnot(None)).all()
        return {
            user.credit_card_number.replace(' ', ''): user.id 
            for user in users 
            if user.credit_card_number
        }
    
    @staticmethod
    def _map_currency_code(csv_currency: str) -> str:
        """Map CSV currency codes to system currency codes"""
        currency_mapping = {
            'USD': 'USD',
            'S/.': 'PEN',
            'LOC': 'PEN',  # Local currency (Peru)
            'R$': 'BRL',
            'CLP': 'CLP',
            'CRC': 'CRC',
            'EUR': 'EUR',
            '$': 'USD'  # Default $ to USD
        }
        return currency_mapping.get(csv_currency, csv_currency)
