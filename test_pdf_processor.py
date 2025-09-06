#!/usr/bin/env python3
"""
Test script for PDF statement processing
This script tests the PDF processing without requiring the full backend setup
"""
import sys
import os

# Add the backend directory to Python path
sys.path.append('backend')

def test_pdf_processing():
    """Test PDF processing with the uploaded bank statement"""
    
    pdf_file = "storage/Tarjeta Visa vcto julio - LPHILIPPS.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ PDF file not found: {pdf_file}")
        return False
    
    print(f"📄 Testing PDF processing with: {pdf_file}")
    print(f"📊 File size: {os.path.getsize(pdf_file)} bytes")
    
    try:
        # Try to import required libraries
        try:
            import pdfplumber
            print("✅ pdfplumber library available")
        except ImportError:
            print("❌ pdfplumber not installed")
            print("💡 Install with: pip install pdfplumber")
            return False
        
        # Test basic PDF reading
        with pdfplumber.open(pdf_file) as pdf:
            print(f"📄 PDF has {len(pdf.pages)} page(s)")
            
            # Extract text from first page
            first_page = pdf.pages[0]
            text = first_page.extract_text()
            
            if text:
                print("✅ Text extraction successful")
                print("\n🔍 First 500 characters:")
                print("-" * 50)
                print(text[:500])
                print("-" * 50)
                
                # Look for key indicators
                indicators = {
                    "Account number": "N DE CUENTA" in text,
                    "Statement period": "CIERRE ANTERIOR" in text,
                    "Transaction data": any(date in text for date in ["03/07/2025", "16/06/2025"]),
                    "Amount columns": "M.LOC" in text and "DOLARES" in text,
                    "Total balance": "SALDO ACTUAL" in text
                }
                
                print("\n📋 Content Analysis:")
                for indicator, found in indicators.items():
                    status = "✅" if found else "❌"
                    print(f"{status} {indicator}: {'Found' if found else 'Not found'}")
                
            else:
                print("❌ No text extracted from PDF")
                return False
            
            # Test table extraction
            tables = first_page.extract_tables()
            if tables:
                print(f"\n📊 Found {len(tables)} table(s)")
                
                # Analyze the largest table
                largest_table = max(tables, key=len)
                print(f"📈 Largest table has {len(largest_table)} rows")
                
                if len(largest_table) > 1:
                    print("\n🔍 Table sample (first 3 rows):")
                    for i, row in enumerate(largest_table[:3]):
                        print(f"Row {i}: {row}")
                        
                    # Look for transaction patterns
                    transaction_rows = 0
                    for row in largest_table[1:]:  # Skip header
                        if len(row) >= 4 and row[0] and '/' in str(row[0]):
                            transaction_rows += 1
                    
                    print(f"📊 Potential transaction rows: {transaction_rows}")
                    
            else:
                print("❌ No tables extracted")
        
        print("\n✅ PDF processing test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during PDF processing: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False

def test_text_parsing():
    """Test text-based transaction parsing as fallback"""
    print("\n🔍 Testing text-based parsing...")
    
    # Sample text from the statement (based on what we can see)
    sample_text = """
    03/07/2025    PAGO BANCO BATCH                          -292,00         0,00
    03/07/2025    PAGO BANCO BATCH                            0,00       -185,89
    13/06/2025  44930039   LA BAGUETTE CHACARILLA              72,00         0,00
    15/06/2025  55410153   PAYU*TAXI DIRECTO                   84,00         0,00
    """
    
    import re
    
    # Transaction pattern: date, document, description, local amount, usd amount
    pattern = r'(\d{2}/\d{2}/\d{4})\s+([^\s]*)\s+(.+?)\s+([-]?[\d,]+\.?\d*)\s+([-]?[\d,]+\.?\d*)'
    
    matches = re.findall(pattern, sample_text)
    
    print(f"📊 Found {len(matches)} transactions in sample text:")
    for i, match in enumerate(matches):
        fecha, comprobante, detalle, monto_local, monto_usd = match
        print(f"  {i+1}. {fecha} | {comprobante} | {detalle.strip()} | PEN: {monto_local} | USD: {monto_usd}")
    
    return len(matches) > 0

if __name__ == "__main__":
    print("🚀 PDF Statement Processing Test")
    print("=" * 50)
    
    success = test_pdf_processing()
    
    if success:
        test_text_parsing()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ Test completed successfully!")
        print("💡 The PDF processing approach looks promising for your bank statement.")
    else:
        print("❌ Test failed. Check the error messages above.")
    
    print("\n📋 Next Steps:")
    print("1. Install pdfplumber: pip install pdfplumber")
    print("2. Add the PDF processor to your backend")
    print("3. Create the database models")
    print("4. Build the frontend UI for statement upload")
