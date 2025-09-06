#!/usr/bin/env python3
"""
Enhanced PDF test with actual transaction extraction
"""
import sys
import re
from decimal import Decimal

sys.path.append('backend')

def advanced_pdf_test():
    """Advanced test with actual transaction extraction"""
    
    pdf_file = "storage/Tarjeta Visa vcto julio - LPHILIPPS.pdf"
    
    try:
        import pdfplumber
        
        with pdfplumber.open(pdf_file) as pdf:
            print("🔍 ADVANCED PDF PROCESSING TEST")
            print("=" * 50)
            
            page = pdf.pages[0]
            text = page.extract_text()
            
            # Print full text for analysis
            print("\n📄 FULL PDF TEXT:")
            print("-" * 30)
            print(text)
            print("-" * 30)
            
            # Extract specific information
            print("\n📊 EXTRACTED INFORMATION:")
            
            # Account number
            account_match = re.search(r'N DE CUENTA\s+(\d+)', text)
            if account_match:
                print(f"✅ Account: {account_match.group(1)}")
            
            # Statement period
            period_start = re.search(r'CIERRE ANTERIOR\s+(\d+\s+\w+\s+\d+)', text)
            if period_start:
                print(f"✅ Period Start: {period_start.group(1)}")
            
            period_end = re.search(r'PROXIMO CIERRE\s+(\d+\s+\w+\s+\d+)', text)
            if period_end:
                print(f"✅ Period End: {period_end.group(1)}")
            
            # Try to find transaction section
            print("\n🔍 SEARCHING FOR TRANSACTIONS:")
            
            # Look for patterns that might be transactions
            # Pattern 1: DD/MM/YYYY followed by data
            date_patterns = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
            print(f"📅 Found {len(date_patterns)} date patterns: {date_patterns}")
            
            # Pattern 2: Look for amount patterns
            amount_patterns = re.findall(r'([-]?[\d,]+\.?\d*)', text)
            print(f"💰 Found amount-like patterns: {amount_patterns[:10]}...")  # Show first 10
            
            # Pattern 3: Look for transaction lines
            lines = text.split('\n')
            transaction_lines = []
            
            for i, line in enumerate(lines):
                if re.search(r'\d{2}/\d{2}/\d{4}', line):
                    transaction_lines.append((i, line.strip()))
            
            print(f"\n📝 LINES WITH DATES ({len(transaction_lines)} found):")
            for line_num, line in transaction_lines:
                print(f"  Line {line_num}: {line}")
            
            # Try table extraction with different settings
            print("\n📊 TABLE EXTRACTION ATTEMPTS:")
            
            # Attempt 1: Default table extraction
            tables = page.extract_tables()
            print(f"Attempt 1 - Default: {len(tables)} tables found")
            
            # Attempt 2: Custom table settings
            custom_tables = page.extract_tables(
                table_settings={
                    "vertical_strategy": "lines_strict",
                    "horizontal_strategy": "lines_strict"
                }
            )
            print(f"Attempt 2 - Strict lines: {len(custom_tables)} tables found")
            
            # Attempt 3: Text-based table
            text_tables = page.extract_tables(
                table_settings={
                    "vertical_strategy": "text",
                    "horizontal_strategy": "text"
                }
            )
            print(f"Attempt 3 - Text-based: {len(text_tables)} tables found")
            
            # Show the best table found
            all_tables = tables + custom_tables + text_tables
            if all_tables:
                best_table = max(all_tables, key=lambda t: len(t) if t else 0)
                if best_table and len(best_table) > 1:
                    print(f"\n📋 BEST TABLE FOUND ({len(best_table)} rows):")
                    for i, row in enumerate(best_table[:5]):  # Show first 5 rows
                        print(f"  Row {i}: {row}")
            
            # Manual transaction parsing from text
            print("\n🔧 MANUAL TRANSACTION PARSING:")
            transactions = extract_transactions_from_text(text)
            
            if transactions:
                print(f"✅ Successfully extracted {len(transactions)} transactions:")
                total_pen = 0
                total_usd = 0
                
                for i, tx in enumerate(transactions):
                    print(f"  {i+1}. {tx['fecha']} | {tx['comprobante']} | {tx['detalle'][:30]}... | PEN: {tx['monto_local']} | USD: {tx['monto_usd']}")
                    if tx['monto_local']:
                        total_pen += tx['monto_local']
                    if tx['monto_usd']:
                        total_usd += tx['monto_usd']
                
                print(f"\n💰 CALCULATED TOTALS:")
                print(f"  Total PEN: {total_pen}")
                print(f"  Total USD: {total_usd}")
                
                # Look for actual totals in PDF to validate
                total_match = re.search(r'SALDO ACTUAL.*?([-]?[\d,]+\.?\d*)', text)
                if total_match:
                    pdf_total = float(total_match.group(1).replace(',', ''))
                    print(f"  PDF Total: {pdf_total}")
                    print(f"  Match: {'✅' if abs(total_pen - pdf_total) < 0.01 else '❌'}")
            
            else:
                print("❌ No transactions extracted")
            
            return len(transactions) > 0
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def extract_transactions_from_text(text):
    """Extract transactions using multiple parsing strategies"""
    transactions = []
    
    # Strategy 1: Look for complete transaction lines
    # Pattern: date + document + description + amounts
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for date at start of line
        date_match = re.match(r'^(\d{2}/\d{2}/\d{4})', line)
        if not date_match:
            continue
        
        fecha = date_match.group(1)
        remaining = line[date_match.end():].strip()
        
        # Try to parse the rest of the line
        # Look for amounts at the end
        amount_pattern = r'([-]?[\d,]+\.?\d*)\s+([-]?[\d,]+\.?\d*)$'
        amount_match = re.search(amount_pattern, remaining)
        
        if amount_match:
            monto_local_str = amount_match.group(1).replace(',', '')
            monto_usd_str = amount_match.group(2).replace(',', '')
            
            try:
                monto_local = float(monto_local_str) if monto_local_str != '0,00' else None
                monto_usd = float(monto_usd_str) if monto_usd_str != '0,00' else None
            except ValueError:
                continue
            
            # Extract description (everything between date and amounts)
            desc_part = remaining[:amount_match.start()].strip()
            
            # Try to separate document number from description
            parts = desc_part.split(None, 1)  # Split on first whitespace
            if len(parts) >= 2:
                comprobante = parts[0]
                detalle = parts[1]
            else:
                comprobante = ""
                detalle = desc_part
            
            transactions.append({
                'fecha': fecha,
                'comprobante': comprobante,
                'detalle': detalle,
                'monto_local': monto_local,
                'monto_usd': monto_usd
            })
    
    return transactions

if __name__ == "__main__":
    success = advanced_pdf_test()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ ENHANCED TEST SUCCESSFUL!")
        print("💡 PDF processing is ready for implementation!")
    else:
        print("❌ Test failed or no transactions found")
        print("💡 May need manual parsing adjustments")
