#!/usr/bin/env python3
"""
Create initial data for Viaticos 2025
"""

import sys
import os
sys.path.append('/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User, Country, ExpenseCategory, UserProfile
from app.services.auth_service import AuthService
from app.core.config import settings

# Database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_initial_data():
    """Create initial data for the application"""
    db = SessionLocal()
    auth_service = AuthService()
    
    try:
        print("🚀 Creating initial data for Viaticos 2025...")
        
        # 1. Create Countries
        print("\n📍 Creating countries...")
        
        # Check if countries already exist
        existing_countries = db.query(Country).count()
        if existing_countries == 0:
            countries = [
                Country(name="Peru", currency="PEN"),
                Country(name="Chile", currency="CLP")
            ]
            
            for country in countries:
                db.add(country)
                print(f"   ✓ Added country: {country.name} ({country.currency})")
            
            db.commit()
            print("   ✅ Countries created successfully!")
        else:
            print(f"   ℹ️  Countries already exist ({existing_countries} found)")
        
        # 2. Create Expense Categories
        print("\n📊 Creating expense categories...")
        
        # Check if categories already exist
        existing_categories = db.query(ExpenseCategory).count()
        if existing_categories == 0:
            categories = [
                ExpenseCategory(name="Food", account="10001", alert_amount=500.00)
            ]
            
            for category in categories:
                db.add(category)
                print(f"   ✓ Added category: {category.name} (SAP: {category.account})")
            
            db.commit()
            print("   ✅ Expense categories created successfully!")
        else:
            print(f"   ℹ️  Expense categories already exist ({existing_categories} found)")
        
        # 3. Create Super Admin User
        print("\n👤 Creating super admin user...")
        
        # Check if super admin already exists
        existing_admin = db.query(User).filter(User.email == "test@test.com").first()
        if not existing_admin:
            # Get Peru country for the admin user
            peru = db.query(Country).filter(Country.name == "Peru").first()
            if not peru:
                print("   ❌ Error: Peru country not found!")
                return
            
            # Hash the password
            hashed_password = auth_service.get_password_hash("admin123")
            
            # Create super admin user
            admin_user = User(
                email="test@test.com",
                name="Super",
                surname="Admin",
                password=hashed_password,
                sap_code="ADMIN001",
                country_id=peru.id,
                cost_center="ADMIN",
                credit_card_number=None,
                supervisor_id=None,
                profile=UserProfile.TREASURY,  # Treasury has highest level access
                is_superuser=True,
                is_approver=True,
                force_password_change=False  # Allow immediate use
            )
            
            db.add(admin_user)
            db.commit()
            
            print(f"   ✓ Created super admin user:")
            print(f"     📧 Email: {admin_user.email}")
            print(f"     🔑 Password: admin123")
            print(f"     🏆 Profile: {admin_user.profile}")
            print(f"     ⚡ Superuser: {admin_user.is_superuser}")
            print(f"     ✅ Approver: {admin_user.is_approver}")
            print("   ✅ Super admin created successfully!")
        else:
            print(f"   ℹ️  Super admin user already exists: {existing_admin.email}")
        
        print("\n🎉 Initial data creation completed!")
        print("\n📋 Summary:")
        print(f"   • Countries: {db.query(Country).count()}")
        print(f"   • Expense Categories: {db.query(ExpenseCategory).count()}")
        print(f"   • Users: {db.query(User).count()}")
        
        print("\n🔐 Login Credentials:")
        print("   📧 Email: test@test.com")
        print("   🔑 Password: admin123")
        
    except Exception as e:
        print(f"❌ Error creating initial data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_data()

