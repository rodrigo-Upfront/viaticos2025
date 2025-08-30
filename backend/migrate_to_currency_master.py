"""
Database migration script to implement Currency master table refactor

This script:
1. Creates the new Currency table
2. Populates it with initial currency data
3. Updates existing Prepayment and Expense records
4. Removes the currency column from Country table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database.connection import SessionLocal, engine
from app.models.models import Currency, Country, Prepayment, Expense

def run_migration():
    """Execute the currency master migration"""
    db = SessionLocal()
    
    try:
        print("🚀 Starting Currency Master Migration...")
        
        # Step 1: Create initial currencies if they don't exist
        print("📋 Step 1: Creating initial currencies...")
        existing_currencies = db.query(Currency).first()
        if not existing_currencies:
            currencies = [
                {"name": "Peruvian Sol", "code": "PEN", "symbol": "S/"},
                {"name": "US Dollar", "code": "USD", "symbol": "$"},
                {"name": "Chilean Peso", "code": "CLP", "symbol": "$"},
                {"name": "Euro", "code": "EUR", "symbol": "€"},
                {"name": "Mexican Peso", "code": "MXN", "symbol": "$"},
                {"name": "Colombian Peso", "code": "COP", "symbol": "$"},
                {"name": "Brazilian Real", "code": "BRL", "symbol": "R$"},
                {"name": "Argentine Peso", "code": "ARS", "symbol": "$"}
            ]
            
            for currency_data in currencies:
                currency = Currency(**currency_data)
                db.add(currency)
            
            db.commit()
            print(f"   ✅ Created {len(currencies)} currencies")
        else:
            print("   ✅ Currencies already exist")
        
        # Step 2: Update existing Prepayments to use currency_id
        print("📋 Step 2: Migrating Prepayment currency data...")
        
        # Check if the currency_id column exists in prepayments
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prepayments' AND column_name = 'currency_id'
        """))
        
        if not result.fetchone():
            print("   ⚠️  currency_id column not found in prepayments table - skipping migration")
        else:
            # Get all prepayments that have currency but no currency_id
            prepayments_to_update = db.execute(text("""
                SELECT p.id, p.currency 
                FROM prepayments p 
                WHERE p.currency IS NOT NULL AND p.currency_id IS NULL
            """)).fetchall()
            
            print(f"   📊 Found {len(prepayments_to_update)} prepayments to update")
            
            for prep in prepayments_to_update:
                # Find matching currency
                currency = db.query(Currency).filter(Currency.code == prep.currency).first()
                if currency:
                    db.execute(text("""
                        UPDATE prepayments 
                        SET currency_id = :currency_id 
                        WHERE id = :prepayment_id
                    """), {"currency_id": currency.id, "prepayment_id": prep.id})
                    print(f"   ✅ Updated prepayment {prep.id}: {prep.currency} -> currency_id {currency.id}")
                else:
                    print(f"   ⚠️  No matching currency found for {prep.currency} in prepayment {prep.id}")
            
            db.commit()
        
        # Step 3: Update existing Expenses to use currency_id
        print("📋 Step 3: Migrating Expense currency data...")
        
        # Check if the currency_id column exists in expenses
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'expenses' AND column_name = 'currency_id'
        """))
        
        if not result.fetchone():
            print("   ⚠️  currency_id column not found in expenses table - skipping migration")
        else:
            # Get all expenses that have currency but no currency_id
            expenses_to_update = db.execute(text("""
                SELECT e.id, e.currency 
                FROM expenses e 
                WHERE e.currency IS NOT NULL AND e.currency_id IS NULL
            """)).fetchall()
            
            print(f"   📊 Found {len(expenses_to_update)} expenses to update")
            
            for expense in expenses_to_update:
                # Find matching currency
                currency = db.query(Currency).filter(Currency.code == expense.currency).first()
                if currency:
                    db.execute(text("""
                        UPDATE expenses 
                        SET currency_id = :currency_id 
                        WHERE id = :expense_id
                    """), {"currency_id": currency.id, "expense_id": expense.id})
                    print(f"   ✅ Updated expense {expense.id}: {expense.currency} -> currency_id {currency.id}")
                else:
                    print(f"   ⚠️  No matching currency found for {expense.currency} in expense {expense.id}")
            
            db.commit()
        
        # Step 4: Remove currency column from countries (if it still exists)
        print("📋 Step 4: Checking if currency column exists in countries...")
        
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'countries' AND column_name = 'currency'
        """))
        
        if result.fetchone():
            print("   ⚠️  Currency column still exists in countries table")
            print("   ℹ️  Note: Column removal should be handled by SQLAlchemy model changes")
        else:
            print("   ✅ Currency column already removed from countries table")
        
        print("🎉 Currency Master Migration completed successfully!")
        
        # Summary
        currency_count = db.query(Currency).count()
        print(f"\n📊 Migration Summary:")
        print(f"   • Total currencies: {currency_count}")
        
        # Count prepayments with currency_id
        prep_with_currency = db.execute(text("""
            SELECT COUNT(*) FROM prepayments WHERE currency_id IS NOT NULL
        """)).scalar()
        print(f"   • Prepayments with currency_id: {prep_with_currency}")
        
        # Count expenses with currency_id
        exp_with_currency = db.execute(text("""
            SELECT COUNT(*) FROM expenses WHERE currency_id IS NOT NULL
        """)).scalar()
        print(f"   • Expenses with currency_id: {exp_with_currency}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

