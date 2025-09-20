"""
SAP File Generation Service
Handles generation of SAP prepayment files for treasury approval
"""

import os
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Prepayment, LocationCurrency
from app.core.config import settings


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
        
        # Generate SAP file content
        today = datetime.now()
        date_str = today.strftime("%d.%m.%Y")
        
        # Format amount with 2 decimals if needed
        amount = float(prepayment.amount)
        if amount == int(amount):
            amount_str = f"-{int(amount)}"
        else:
            amount_str = f"-{amount:.2f}"
        
        # Build SAP file fields
        fields = [
            location.sap_code,                    # COMP_CODE
            date_str,                            # DOC_DATE
            date_str,                            # PSTNG_DATE
            deposit_number,                      # REF_DOC_NO
            "0000000001",                        # ITEMNO_ACC
            prepayment.reason,                   # HEADER_TXT
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
