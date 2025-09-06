"""
PDF Statement Processing Service
Extracts transaction data from bank/credit card statements
"""
import re
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from decimal import Decimal

# Note: Install these dependencies in requirements.txt:
# pdfplumber==0.10.3
# pandas>=2.0.0

try:
    import pdfplumber
    import pandas as pd
except ImportError:
    pdfplumber = None
    pd = None

logger = logging.getLogger(__name__)

class StatementTransaction:
    """Represents a single transaction from a statement"""
    def __init__(self, fecha: str, comprobante: str, detalle: str, 
                 monto_local: Optional[float], monto_usd: Optional[float]):
        self.fecha = fecha
        self.comprobante = comprobante
        self.detalle = detalle
        self.monto_local = monto_local
        self.monto_usd = monto_usd
    
    def to_dict(self) -> Dict:
        return {
            'fecha': self.fecha,
            'comprobante': self.comprobante,
            'detalle': self.detalle,
            'monto_local': self.monto_local,
            'monto_usd': self.monto_usd
        }

class StatementProcessor:
    """Processes PDF bank statements to extract transaction data"""
    
    def __init__(self):
        if not pdfplumber:
            raise ImportError("pdfplumber not installed. Run: pip install pdfplumber pandas")
    
    def extract_transactions_from_pdf(self, pdf_path: str) -> Tuple[List[StatementTransaction], Dict]:
        """
        Extract transactions from PDF statement
        
        Returns:
            - List of transactions
            - Metadata (totals, period, etc.)
        """
        transactions = []
        metadata = {}
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Extract text from all pages
                full_text = ""
                tables_data = []
                
                for page in pdf.pages:
                    full_text += page.extract_text() + "\n"
                    
                    # Try to extract tables
                    tables = page.extract_tables()
                    if tables:
                        tables_data.extend(tables)
                
                # Extract metadata (account info, period, totals)
                metadata = self._extract_metadata(full_text)
                
                # Process tables to find transaction data
                transactions = self._process_tables(tables_data)
                
                # If table extraction fails, try text parsing
                if not transactions:
                    transactions = self._parse_text_transactions(full_text)
                
                # Calculate totals from transactions if not found in metadata
                if transactions and ('total_local' not in metadata or 'total_usd' not in metadata):
                    calculated_totals = self._calculate_totals_from_transactions(transactions)
                    if 'total_local' not in metadata and calculated_totals['total_local'] != 0:
                        metadata['total_local'] = calculated_totals['total_local']
                    if 'total_usd' not in metadata and calculated_totals['total_usd'] != 0:
                        metadata['total_usd'] = calculated_totals['total_usd']
                
                # Validate against totals
                self._validate_transactions(transactions, metadata)
                
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise
        
        return transactions, metadata
    
    def _extract_metadata(self, text: str) -> Dict:
        """Extract account info, period, and totals from statement text"""
        metadata = {}
        
        # Extract account number
        account_match = re.search(r'N DE CUENTA\s+(\d+)', text)
        if account_match:
            metadata['account_number'] = account_match.group(1)
        
        # Extract statement period
        period_match = re.search(r'CIERRE ANTERIOR\s+(\d+\s+\w+\s+\d+)', text)
        if period_match:
            metadata['period_start'] = period_match.group(1)
        
        next_period = re.search(r'PROXIMO CIERRE\s+(\d+\s+\w+\s+\d+)', text)
        if next_period:
            metadata['period_end'] = next_period.group(1)
        
        # Extract totals for validation - try multiple patterns
        total_local = re.search(r'SALDO ACTUAL\s+M\.LOC\.\s+([-]?[\d,]+\.?\d*)', text)
        if not total_local:
            # Look for other total patterns
            total_local = re.search(r'M\.?\s*LOC\.?\s*([-]?[\d,]+\.?\d*)', text)
        if total_local:
            metadata['total_local'] = float(total_local.group(1).replace(',', ''))
        
        total_usd = re.search(r'US\$\s+([-]?[\d,]+\.?\d*)', text)
        if not total_usd:
            # Look for USD/DOLARES patterns  
            total_usd = re.search(r'(?:USD|DOLARES)\s*([-]?[\d,]+\.?\d*)', text)
        if total_usd:
            metadata['total_usd'] = float(total_usd.group(1).replace(',', ''))
        
        return metadata
    
    def _process_tables(self, tables_data: List) -> List[StatementTransaction]:
        """Process extracted tables to find transaction data"""
        transactions = []
        
        for table in tables_data:
            if not table or len(table) < 2:
                continue
            
            # Debug: Log table structure
            logger.info(f"Processing table with {len(table)} rows, {len(table[0]) if table[0] else 0} columns")
            for i, row in enumerate(table[:5]):  # Log first 5 rows for debugging
                logger.info(f"Row {i}: {row}")
                
            # Also log all detected transaction rows
            transaction_count = 0
            for row in table[1:]:  # Skip header
                if len(row) >= 4 and self._is_transaction_row(row):
                    transaction_count += 1
                    logger.info(f"Found transaction row {transaction_count}: {row}")
            
            logger.info(f"Total transaction rows found in this table: {transaction_count}")
            
            # Look for table with transaction pattern
            # Expected columns: FECHA, COMPROBANTE, DETALLE, M.LOC, DOLARES
            for row in table[1:]:  # Skip header
                if len(row) >= 4 and self._is_transaction_row(row):
                    transaction = self._parse_transaction_row(row)
                    if transaction:
                        transactions.append(transaction)
        
        return transactions
    
    def _is_transaction_row(self, row: List) -> bool:
        """Check if a table row represents a transaction"""
        if not row or len(row) < 4:
            return False
        
        # Check if first column looks like a date (DD/MM/YYYY)
        date_pattern = r'\d{2}/\d{2}/\d{4}'
        return bool(re.match(date_pattern, str(row[0] or '')))
    
    def _parse_transaction_row(self, row: List) -> Optional[StatementTransaction]:
        """Parse a single transaction row"""
        try:
            fecha = str(row[0]).strip()
            comprobante = str(row[1] or '').strip()
            detalle = str(row[2] or '').strip()
            
            # Parse amounts (handle negative values, commas, etc.)
            monto_local = self._parse_amount(row[3] if len(row) > 3 else None)
            monto_usd = self._parse_amount(row[4] if len(row) > 4 else None)
            
            return StatementTransaction(fecha, comprobante, detalle, monto_local, monto_usd)
            
        except Exception as e:
            logger.warning(f"Error parsing transaction row: {e}")
            return None
    
    def _parse_amount(self, amount_str) -> Optional[float]:
        """Parse monetary amount from string"""
        if not amount_str or str(amount_str).strip() in ['', '-', '0,00', '0.00']:
            return None
        
        try:
            # Clean the amount string
            amount_str = str(amount_str).strip()
            
            # Handle negative amounts
            is_negative = '-' in amount_str
            amount_clean = amount_str.replace('-', '').replace(' ', '')
            
            # Handle different decimal formats
            if ',' in amount_clean and '.' not in amount_clean:
                # European format: 1.234,56 or just 123,45
                if amount_clean.count(',') == 1:
                    # Check if comma is decimal separator (last 2-3 digits)
                    parts = amount_clean.split(',')
                    if len(parts[1]) <= 3:  # Decimal separator
                        amount_clean = amount_clean.replace(',', '.')
                    else:  # Thousands separator
                        amount_clean = amount_clean.replace(',', '')
                else:
                    # Multiple commas - remove all as thousands separators
                    amount_clean = amount_clean.replace(',', '')
            elif ',' in amount_clean and '.' in amount_clean:
                # Mixed format: 1,234.56 - remove commas
                amount_clean = amount_clean.replace(',', '')
            
            amount = float(amount_clean)
            return -amount if is_negative else amount
            
        except (ValueError, TypeError):
            return None
    
    def _parse_text_transactions_improved(self, text: str) -> List[StatementTransaction]:
        """Improved text parsing using better column detection"""
        transactions = []
        lines = text.split('\n')
        
        for line in lines:
            line_orig = line
            line = line.strip()
            if not line or len(line) < 20:  # Skip short lines
                continue
                
            # Look for lines that start with a date pattern
            date_match = re.match(r'^(\d{2}/\d{2}/\d{4})', line)
            if not date_match:
                continue
                
            fecha = date_match.group(1)
            rest_of_line = line[len(fecha):].strip()
            
            # Look for amount patterns at the end of the line
            # Match patterns like: -292,00  1855,89  S/ 72.00  USD 828.14
            amount_patterns = [
                r'([-]?S\/\s*[\d,]+\.?\d*)',  # S/ amounts
                r'([-]?USD\s*[\d,]+\.?\d*)',  # USD amounts  
                r'([-]?\d{1,3}(?:,\d{3})*\.?\d*)',  # Plain numbers with commas
                r'([-]?\d+\.\d{2})'  # Decimal amounts
            ]
            
            amounts_found = []
            description_end = len(rest_of_line)
            
            # Find amounts from right to left
            temp_line = rest_of_line
            for pattern in amount_patterns:
                matches = list(re.finditer(pattern, temp_line))
                for match in reversed(matches):  # Process from right to left
                    amount_text = match.group(1)
                    amount_value = self._parse_amount(amount_text)
                    if amount_value is not None:
                        amounts_found.append((amount_text, amount_value, match.start(), match.end()))
                        # Remove this amount from consideration
                        description_end = min(description_end, match.start())
            
            # Extract description part (everything before amounts)
            description_part = rest_of_line[:description_end].strip()
            
            # Split description into comprobante and detalle
            # First non-whitespace sequence is comprobante, rest is detalle
            desc_parts = description_part.split(None, 1)
            comprobante = desc_parts[0] if desc_parts else ""
            detalle = desc_parts[1] if len(desc_parts) > 1 else ""
            
            # Classify amounts as PEN or USD
            monto_local = None
            monto_usd = None
            
            for amount_text, amount_value, start, end in amounts_found:
                if 'S/' in amount_text:
                    monto_local = amount_value
                elif 'USD' in amount_text:
                    monto_usd = amount_value
                elif monto_local is None:
                    # First unclassified amount goes to local currency
                    monto_local = amount_value
                elif monto_usd is None:
                    # Second unclassified amount goes to USD
                    monto_usd = amount_value
            
            # Only create transaction if we have meaningful data
            if (monto_local is not None or monto_usd is not None) and detalle:
                transaction = StatementTransaction(
                    fecha=fecha,
                    comprobante=comprobante,
                    detalle=detalle,
                    monto_local=monto_local,
                    monto_usd=monto_usd
                )
                transactions.append(transaction)
                
        return transactions
    
    def _parse_text_transactions(self, text: str) -> List[StatementTransaction]:
        """Fallback: parse transactions from raw text"""
        transactions = []
        
        # Look for transaction patterns in text
        # More flexible pattern to catch different formats
        # Pattern: DD/MM/YYYY followed by transaction details and amounts
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for lines starting with date pattern
            date_match = re.match(r'^(\d{2}/\d{2}/\d{4})', line)
            if not date_match:
                continue
            
            fecha = date_match.group(1)
            rest = line[len(fecha):].strip()
            
            # Try to extract amounts and description
            # Look for currency amounts at the end of the line
            amount_patterns = [
                r'([-]?S\/\s*[\d,]+\.?\d*)',  # S/ amounts
                r'([-]?USD\s*[\d,]+\.?\d*)',  # USD amounts
                r'([-]?\d+,\d{2})',  # Amounts with commas as decimal
                r'([-]?\d+\.\d{2})'   # Amounts with dots as decimal
            ]
            
            found_amounts = []
            temp_rest = rest
            
            # Find all amounts in the line
            for pattern in amount_patterns:
                matches = re.findall(pattern, temp_rest)
                found_amounts.extend(matches)
            
            # Remove amounts from the description part
            description_part = rest
            for amount in found_amounts:
                description_part = description_part.replace(amount, '', 1).strip()
            
            # Split description into comprobante and detalle
            desc_parts = description_part.split(None, 1)
            comprobante = desc_parts[0] if desc_parts else ""
            detalle = desc_parts[1] if len(desc_parts) > 1 else description_part
            
            # Parse amounts
            monto_local = None
            monto_usd = None
            
            for amount_str in found_amounts:
                if 'S/' in amount_str:
                    monto_local = self._parse_amount(amount_str)
                elif 'USD' in amount_str:
                    monto_usd = self._parse_amount(amount_str)
                elif ',' in amount_str and len(amount_str.split(',')[1]) == 2:
                    # Likely PEN amount with comma decimal
                    if monto_local is None:
                        monto_local = self._parse_amount(amount_str)
                    else:
                        monto_usd = self._parse_amount(amount_str)
                elif '.' in amount_str and len(amount_str.split('.')[1]) == 2:
                    # Likely USD amount with dot decimal
                    if monto_usd is None:
                        monto_usd = self._parse_amount(amount_str)
                    else:
                        monto_local = self._parse_amount(amount_str)
            
            # Create transaction if we have at least a description
            if detalle.strip():
                transaction = StatementTransaction(
                    fecha=fecha,
                    comprobante=comprobante,
                    detalle=detalle.strip(),
                    monto_local=monto_local,
                    monto_usd=monto_usd
                )
                transactions.append(transaction)
        
        return transactions
        
        # Old regex approach as fallback
        pattern = r'(\d{2}/\d{2}/\d{4})\s+([^\s]*)\s+(.+?)\s+([-]?[\d,]+\.?\d*)\s+([-]?[\d,]+\.?\d*)?'
        
        matches = re.findall(pattern, text)
        for match in matches:
            fecha, comprobante, detalle, monto_local, monto_usd = match
            
            transaction = StatementTransaction(
                fecha=fecha.strip(),
                comprobante=comprobante.strip(),
                detalle=detalle.strip(),
                monto_local=self._parse_amount(monto_local),
                monto_usd=self._parse_amount(monto_usd) if monto_usd else None
            )
            transactions.append(transaction)
        
        return transactions
    
    def _calculate_totals_from_transactions(self, transactions: List[StatementTransaction]) -> Dict:
        """Calculate total amounts from transaction list"""
        total_local = 0.0
        total_usd = 0.0
        
        for transaction in transactions:
            if transaction.monto_local:
                total_local += transaction.monto_local
            if transaction.monto_usd:
                total_usd += transaction.monto_usd
                
        return {
            'total_local': total_local,
            'total_usd': total_usd
        }
    
    def _validate_transactions(self, transactions: List[StatementTransaction], metadata: Dict):
        """Validate extracted transactions against statement totals"""
        if not transactions:
            logger.warning("No transactions extracted")
            return
        
        # Calculate totals from transactions
        total_local = sum(t.monto_local or 0 for t in transactions)
        total_usd = sum(t.monto_usd or 0 for t in transactions)
        
        # Compare with metadata totals (if available)
        expected_local = metadata.get('total_local')
        expected_usd = metadata.get('total_usd')
        
        logger.info(f"Extracted {len(transactions)} transactions")
        logger.info(f"Calculated totals - Local: {total_local}, USD: {total_usd}")
        
        if expected_local:
            logger.info(f"Expected local total: {expected_local}")
            if abs(total_local - expected_local) > 0.01:
                logger.warning(f"Local total mismatch: {total_local} vs {expected_local}")
        
        if expected_usd:
            logger.info(f"Expected USD total: {expected_usd}")
            if abs(total_usd - expected_usd) > 0.01:
                logger.warning(f"USD total mismatch: {total_usd} vs {expected_usd}")


# Example usage
def process_statement_file(file_path: str) -> Dict:
    """
    Main function to process a statement file
    
    Returns:
        {
            'transactions': List[Dict],
            'metadata': Dict,
            'summary': Dict
        }
    """
    processor = StatementProcessor()
    transactions, metadata = processor.extract_transactions_from_pdf(file_path)
    
    return {
        'transactions': [t.to_dict() for t in transactions],
        'metadata': metadata,
        'summary': {
            'total_transactions': len(transactions),
            'total_local': sum(t.monto_local or 0 for t in transactions),
            'total_usd': sum(t.monto_usd or 0 for t in transactions),
            'date_range': {
                'start': metadata.get('period_start'),
                'end': metadata.get('period_end')
            }
        }
    }
