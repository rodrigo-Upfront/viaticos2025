"""
Create initial currency data for the system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.models.models import Currency

def create_initial_currencies():
    """Create initial currency data"""
    db = SessionLocal()
    
    try:
        # Check if currencies already exist
        existing_currencies = db.query(Currency).first()
        if existing_currencies:
            print("✅ Currencies already exist, skipping...")
            return
        
        # Create initial currencies
        currencies = [
            {
                "name": "Peruvian Sol",
                "code": "PEN",
                "symbol": "S/"
            },
            {
                "name": "US Dollar",
                "code": "USD",
                "symbol": "$"
            },
            {
                "name": "Chilean Peso",
                "code": "CLP",
                "symbol": "$"
            },
            {
                "name": "Euro",
                "code": "EUR",
                "symbol": "€"
            },
            {
                "name": "Mexican Peso",
                "code": "MXN",
                "symbol": "$"
            },
            {
                "name": "Colombian Peso",
                "code": "COP",
                "symbol": "$"
            },
            {
                "name": "Brazilian Real",
                "code": "BRL",
                "symbol": "R$"
            },
            {
                "name": "Argentine Peso",
                "code": "ARS",
                "symbol": "$"
            }
        ]
        
        for currency_data in currencies:
            currency = Currency(**currency_data)
            db.add(currency)
        
        db.commit()
        print("✅ Initial currencies created successfully")
        
        # Print created currencies for verification
        created_currencies = db.query(Currency).all()
        print(f"Created {len(created_currencies)} currencies:")
        for curr in created_currencies:
            print(f"  - {curr.name} ({curr.code}) {curr.symbol}")
            
    except Exception as e:
        print(f"❌ Error creating currencies: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_currencies()

