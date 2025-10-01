"""
SAP File Generation Service
Handles generation of SAP files for treasury and accounting approvals
"""

import os
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.models import (
    Prepayment, LocationCurrency, TravelExpenseReport, Expense, 
    DocumentType, TaxableOption
)
from app.core.config import settings
from sqlalchemy import text


class SAPFileGenerationError(Exception):
    """Custom exception for SAP file generation errors"""
    pass


class SAPService:
    
    @staticmethod
    def generate_prepayment_file(prepayment: Prepayment, deposit_number: str, db: Session) -> str:
        """
        Generate SAP prepayment file for treasury approval
        
        Args:
            prepayment: Prepayment object with loaded relationships
            deposit_number: Treasury deposit number
            db: Database session
            
        Returns:
            str: File path to generated SAP file
            
        Raises:
            SAPFileGenerationError: If required data is missing or file generation fails
        """
        
        # Validate required data
        user = prepayment.requesting_user
        if not user:
            raise SAPFileGenerationError("Prepayment requesting user not found")
            
        if not user.location:
            raise SAPFileGenerationError(f"User {user.name} does not have a location assigned. Please assign a location and retry.")
            
        if not user.sap_code:
            raise SAPFileGenerationError(f"User {user.name} does not have a SAP code assigned. Please assign a SAP code and retry.")
            
        location = user.location
        if not location.sap_code:
            raise SAPFileGenerationError(f"Location {location.name} does not have a SAP code assigned. Please assign a SAP code and retry.")
            
        if not location.cost_center:
            raise SAPFileGenerationError(f"Location {location.name} does not have a cost center assigned. Please assign a cost center and retry.")
            
        # Find location currency account
        location_currency = db.query(LocationCurrency).filter(
            LocationCurrency.location_id == location.id,
            LocationCurrency.currency_id == prepayment.currency_id
        ).first()
        
        if not location_currency:
            currency_code = prepayment.currency.code if prepayment.currency else "Unknown"
            raise SAPFileGenerationError(f"Location {location.name} does not have account configured for currency {currency_code}. Please configure the account and retry.")
        
        # Reserve report_id if not already set (only on first SAP file generation)
        if not prepayment.report_id:
            # Get next sequence value from travel_expense_reports
            next_report_id = db.execute(text("SELECT nextval('travel_expense_reports_id_seq')")).scalar()
            prepayment.report_id = next_report_id
            db.commit()
            db.refresh(prepayment)
        
        # Generate SAP file content
        today = datetime.now()
        date_str = today.strftime("%d.%m.%Y")
        
        # Format amount with 2 decimals if needed
        amount = float(prepayment.amount)
        if amount == int(amount):
            amount_str = f"-{int(amount)}"
        else:
            amount_str = f"-{amount:.2f}"
        
        # Build header text with format: "reportid-reason"
        header_text = f"{prepayment.report_id}-{prepayment.reason}"
        
        # Build SAP file fields
        fields = [
            location.sap_code,                    # COMP_CODE
            date_str,                            # DOC_DATE
            date_str,                            # PSTNG_DATE
            deposit_number,                      # REF_DOC_NO
            "0000000001",                        # ITEMNO_ACC
            header_text,                         # HEADER_TXT (reportid-reason)
            user.sap_code,                       # VENDOR_NO
            location.cost_center,                # PROFIT_CTR
            prepayment.currency.code,            # CURRENCY
            amount_str,                          # AMT_DOCCUR
            location_currency.account,           # GL_ACCOUNT
            prepayment.reason,                   # ITEM_TEXT
            "",                                  # COSTCENTER (empty)
            "",                                  # ALLOC_NMBR (empty)
            date_str,                            # VALUE_DATE
            "",                                  # AMT_DOCCUR (empty)
            "",                                  # TAX_CODE (empty)
            "ANTICIPO"                           # MOVIMIENTO
        ]
        
        # Create file content
        file_content = ";".join(fields)
        
        # Generate filename
        filename = f"prepayment-{prepayment.id}-sap.txt"
        
        # Ensure uploads directory exists
        uploads_dir = os.path.join(settings.UPLOAD_PATH, "sap_files")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(uploads_dir, filename)
        
        try:
            # Write file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_content)
                
            # Return relative path for storage in database
            relative_path = os.path.join("sap_files", filename)
            return relative_path
            
        except Exception as e:
            raise SAPFileGenerationError(f"Failed to generate SAP file: {str(e)}")
    
    @staticmethod
    def get_file_path(relative_path: str) -> str:
        """Get full file path from relative path"""
        return os.path.join(settings.UPLOAD_PATH, relative_path)
    
    @staticmethod
    def delete_file(relative_path: str) -> bool:
        """Delete SAP file"""
        try:
            full_path = SAPService.get_file_path(relative_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def generate_expenses_report_file(report: TravelExpenseReport, db: Session) -> str:
        """
        Generate SAP expenses report file for accounting approval
        Only includes FACTURA expenses
        
        Args:
            report: TravelExpenseReport object with loaded relationships
            db: Database session
            
        Returns:
            str: File path to generated SAP expenses file
            
        Raises:
            SAPFileGenerationError: If required data is missing or file generation fails
        """
        
        # Get FACTURA expenses from the report
        factura_expenses = [exp for exp in report.expenses 
                           if exp.document_type == DocumentType.FACTURA and exp.status.value == 'APPROVED']
        
        if not factura_expenses:
            raise SAPFileGenerationError("No approved FACTURA expenses found in this report")
        
        # Validate user and location data
        user = report.requesting_user
        if not user:
            raise SAPFileGenerationError("Report requesting user not found")
            
        if not user.location:
            raise SAPFileGenerationError(f"User {user.name} does not have a location assigned. Please assign a location and retry.")
            
        if not user.sap_code:
            raise SAPFileGenerationError(f"User {user.name} does not have a SAP code assigned. Please assign a SAP code and retry.")
            
        location = user.location
        
        # Generate file content - one line per FACTURA expense
        file_lines = []
        # Use local timezone for processing date
        from datetime import timezone, timedelta
        local_tz = timezone(timedelta(hours=-5))  # UTC-5 for your timezone
        today = datetime.now(local_tz)
        processing_date = today.strftime("%d.%m.%Y")
        
        for expense in factura_expenses:
            # Validate expense data
            if not expense.category or not expense.category.account:
                raise SAPFileGenerationError(f"Expense category for expense ID {expense.id} does not have a SAP account configured")
            
            # Validate FACTURA supplier has SAP code
            if not expense.factura_supplier:
                raise SAPFileGenerationError(f"FACTURA expense {expense.id} has no supplier assigned. Please assign a supplier and retry.")
            if not expense.factura_supplier.sap_code:
                raise SAPFileGenerationError(f"Supplier '{expense.factura_supplier.name}' has no SAP code assigned. Please assign a SAP code and retry.")
            
            # Calculate tax amounts if taxable
            tax_amount = ""
            tax_code = ""
            calculated_tax_amount = 0
            net_amount_for_tax_field = ""
            
            if expense.taxable == TaxableOption.SI and expense.tax and expense.tax.rate:
                # Calculate tax amount: tax_amount = expense_amount * (tax_rate / (100 + tax_rate))
                rate = float(expense.tax.rate)
                total_amount = float(expense.amount)
                calculated_tax_amount = total_amount * (rate / (100 + rate))
                
                # For tax field (Field 15): Net amount (expense - tax)
                net_amount = total_amount - calculated_tax_amount
                if net_amount == int(net_amount):
                    net_amount_for_tax_field = f"{int(net_amount)}"
                else:
                    net_amount_for_tax_field = f"{net_amount:.2f}"
                
                tax_code = expense.tax.code
            
            # Format expense amount (negative) - should be FULL expense amount
            total_amount = float(expense.amount)
            if total_amount == int(total_amount):
                amount_str = f"-{int(total_amount)}"
            else:
                amount_str = f"-{total_amount:.2f}"
            
            # Format expense date
            expense_date_str = expense.expense_date.strftime("%d.%m.%Y")
            
            # Determine report reason based on report type
            if report.prepayment and report.prepayment.reason:
                report_reason = report.prepayment.reason
            elif report.reason:
                report_reason = report.reason
            else:
                report_reason = f"Expense Report {report.id}"
            
            # Build header text with report ID
            header_text = f"{report.id}-{report_reason}"
            
            # Build SAP file fields for this expense
            fields = [
                location.sap_code,                    # COMP_CODE
                processing_date,                      # DOC_DATE (processing date)
                processing_date,                      # PSTNG_DATE (processing date)
                expense.document_number,              # REF_DOC_NO
                "0000000001",                        # ITEMNO_ACC
                header_text,                         # HEADER_TXT (with report ID)
                expense.factura_supplier.sap_code,   # SUPPLIER_SAP_CODE (supplier SAP code instead of user)
                "",                                  # PROFIT_CTR (always empty)
                expense.currency.code,               # CURRENCY
                amount_str,                          # AMT_DOCCUR (full expense amount, negative)
                expense.category.account,            # GL_ACCOUNT
                expense.purpose,                     # ITEM_TEXT
                user.cost_center,                    # COSTCENTER
                expense.document_number,             # ALLOC_NMBR (document number repeated)
                expense_date_str,                    # VALUE_DATE (expense date)
                net_amount_for_tax_field,            # AMT_DOCCUR_TAX (net amount: expense - tax)
                tax_code,                            # TAX_CODE
                "FACTURA"                            # MOVIMIENTO
            ]
            
            file_lines.append(";".join(fields))
        
        # Create file content
        file_content = "\n".join(file_lines)
        
        # Generate filename
        filename = f"expense-report-{report.id}-expenses-sap.txt"
        
        # Ensure uploads directory exists
        uploads_dir = os.path.join(settings.UPLOAD_PATH, "sap_files", "expense_reports")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(uploads_dir, filename)
        
        try:
            # Write file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_content)
                
            # Return relative path for storage in database
            relative_path = os.path.join("sap_files", "expense_reports", filename)
            return relative_path
            
        except Exception as e:
            raise SAPFileGenerationError(f"Failed to generate SAP expenses file: {str(e)}")

    @staticmethod
    def generate_compensation_report_file(report: TravelExpenseReport, db: Session) -> str:
        """
        Generate SAP compensation report file for accounting approval
        Includes all approved expenses with compensation logic
        
        Args:
            report: TravelExpenseReport object with loaded relationships
            db: Database session
            
        Returns:
            str: File path to generated SAP compensation file
            
        Raises:
            SAPFileGenerationError: If required data is missing or file generation fails
        """
        
        # Get all approved expenses from the report
        approved_expenses = [exp for exp in report.expenses if exp.status.value == 'APPROVED']
        
        if not approved_expenses:
            raise SAPFileGenerationError("No approved expenses found in this report")
        
        # Validate user data
        user = report.requesting_user
        if not user:
            raise SAPFileGenerationError("Report requesting user not found")
            
        if not user.location:
            raise SAPFileGenerationError(f"User {user.name} does not have a location assigned")
        
        # Calculate totals for compensation logic
        total_expenses = sum(float(exp.amount) for exp in approved_expenses)
        prepayment_amount = float(report.prepayment.amount) if report.prepayment else 0.0
        
        # Determine compensation type and amount to return
        if prepayment_amount == 0:
            compensation_type = "COMPENSACION"
            compensation_subtype = "Gastos Aprobados"
            amount_to_return = 0.0
        elif prepayment_amount > total_expenses:
            compensation_type = "COMPENSACION"
            compensation_subtype = "Pendiente de Devolución"
            amount_to_return = prepayment_amount - total_expenses
        elif prepayment_amount < total_expenses:
            compensation_type = "COMPENSACION"
            compensation_subtype = "Aprobado para Reembolso"
            amount_to_return = total_expenses - prepayment_amount
        else:  # Equal amounts
            compensation_type = "COMPENSACION"
            compensation_subtype = "Gastos Aprobados"
            amount_to_return = 0.0
        
        # Determine report reason based on report type
        if report.reason:
            report_reason = report.reason
        elif report.prepayment and report.prepayment.reason:
            report_reason = report.prepayment.reason
        else:
            report_reason = f"Expense Report {report.id}"
        
        # Build header text with report ID for various fields
        report_id_with_reason = f"{report.id}-{report_reason}"
        
        # For prepayment name field, include prepayment reason with report ID if prepayment exists
        prepayment_name = ""
        if report.prepayment:
            prepayment_name = f"{report.id}-{report.prepayment.reason}"
        
        # Sort expenses by document type: FACTURA first, then BOLETA
        sorted_expenses = sorted(approved_expenses, key=lambda exp: (exp.document_type != DocumentType.FACTURA, exp.document_type.value))
        
        # Determine provider to return based on compensation subtype
        # If "Gastos Aprobados" (equal amounts or reimbursement), leave empty
        # Otherwise, use the requesting user's SAP code
        provider_to_return = "" if compensation_subtype == "Gastos Aprobados" else (user.sap_code or "")
        
        # Generate file content - one line per expense
        file_lines = []
        
        for expense in sorted_expenses:
            # Calculate net amount (expense amount - tax amount for taxable expenses)
            expense_amount = float(expense.amount)
            if expense.taxable == TaxableOption.SI and expense.tax and expense.tax.rate:
                # Calculate tax amount: tax_amount = expense_amount * (tax_rate / (100 + tax_rate))
                rate = float(expense.tax.rate)
                tax_amount = expense_amount * (rate / (100 + rate))
                net_amount = expense_amount - tax_amount
            else:
                net_amount = expense_amount
            
            # Build compensation file fields - ALL 18 fields for every expense
            fields = [
                # Fields 1-3: Basic compensation info
                compensation_type,                        # 1. Tipo
                compensation_subtype,                     # 2. Tipo de Compensación
                user.location.sap_code,                  # 3. Sociedad
                
                # Fields 4-6: Prepayment info (only if prepayment exists)
                report.prepayment.sap_record_number or "" if report.prepayment else "",  # 4. No Partida SAP Anticipo
                prepayment_name,                                                          # 5. Nombre Anticipo (with report ID)
                "ANTICIPO" if report.prepayment else "",                                 # 6. Indicador de Anticipo
                
                # Fields 7-9: FACTURA-specific fields (empty for BOLETA)
                expense.sap_invoice_number or "" if expense.document_type == DocumentType.FACTURA else "",  # 7. No Partida SAP Factura
                report_id_with_reason if expense.document_type == DocumentType.FACTURA else "",  # 8. Nombre Factura (with report ID)
                "FACTURA" if expense.document_type == DocumentType.FACTURA else "",      # 9. Indicador de Factura
                
                # Fields 10-12: BOLETA-specific fields (empty for FACTURA)
                "40" if expense.document_type == DocumentType.BOLETA else "",            # 10. Clave del Gasto
                expense.category.account if expense.document_type == DocumentType.BOLETA else "",  # 11. Cuenta mayor
                report_id_with_reason if expense.document_type == DocumentType.BOLETA else "",   # 12. Identificador de Viaje (with report ID)
                
                # Fields 13-16: BOLETA-specific fields (empty for FACTURA)
                f"{net_amount:.2f}" if expense.document_type == DocumentType.BOLETA else "",     # 13. Importe
                "C0" if expense.document_type == DocumentType.BOLETA else "",                    # 14. Indicador de Impuesto
                user.cost_center or "" if expense.document_type == DocumentType.BOLETA else "", # 15. Centro de Costo
                expense.purpose or "" if expense.document_type == DocumentType.BOLETA else "",  # 16. Detalle de Gasto
                
                # Fields 17-18: Common fields for all expenses
                f"{amount_to_return:.0f}" if amount_to_return > 0 else "",  # 17. Importe a devolver
                provider_to_return                       # 18. Proveedor a devolver
            ]
            
            # Ensure empty fields are preserved with separators
            file_lines.append(";".join(str(field) if field is not None else "" for field in fields))
        
        # Create file content
        file_content = "\n".join(file_lines)
        
        # Generate filename
        filename = f"expense-report-{report.id}-compensation-sap.txt"
        
        # Ensure uploads directory exists
        uploads_dir = os.path.join(settings.UPLOAD_PATH, "sap_files", "expense_reports")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Full file path
        file_path = os.path.join(uploads_dir, filename)
        
        try:
            # Write file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_content)
                
            # Return relative path for storage in database
            relative_path = os.path.join("sap_files", "expense_reports", filename)
            return relative_path
            
        except Exception as e:
            raise SAPFileGenerationError(f"Failed to generate SAP compensation file: {str(e)}")
