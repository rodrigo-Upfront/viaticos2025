#!/usr/bin/env python3
"""
Setup comprehensive test data for Viaticos 2025
This script creates all the test data needed for proper testing
"""

import sys
import os
sys.path.append('/app')

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from passlib.context import CryptContext
from datetime import datetime, date
import logging

# Import models
from app.models.models import (
    User, Country, ExpenseCategory, Supplier, Prepayment, 
    TravelExpenseReport, Expense, Base
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@database:5432/viaticos")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def setup_test_data():
    db = SessionLocal()
    
    try:
        print("🚀 Setting up comprehensive test data for Viaticos 2025...")
        
        # Clear existing data (except the basic initial data)
        print("🧹 Cleaning existing test data...")
        
        # 1. COUNTRIES
        print("\n📍 Setting up countries...")
        
        # Check if countries exist, if not create them
        peru = db.query(Country).filter(Country.name == "Peru").first()
        if not peru:
            peru = Country(name="Peru", code="PE", currency="PEN")
            db.add(peru)
            print("   ✓ Added Peru (PEN)")
        
        chile = db.query(Country).filter(Country.name == "Chile").first()
        if not chile:
            chile = Country(name="Chile", code="CL", currency="CLP")
            db.add(chile)
            print("   ✓ Added Chile (CLP)")
        
        # Add additional countries for testing
        usa = db.query(Country).filter(Country.name == "United States").first()
        if not usa:
            usa = Country(name="United States", code="US", currency="USD")
            db.add(usa)
            print("   ✓ Added United States (USD)")
        
        colombia = db.query(Country).filter(Country.name == "Colombia").first()
        if not colombia:
            colombia = Country(name="Colombia", code="CO", currency="COP")
            db.add(colombia)
            print("   ✓ Added Colombia (COP)")
        
        db.flush()  # Get IDs
        
        # 2. EXPENSE CATEGORIES
        print("\n📊 Setting up expense categories...")
        
        categories_data = [
            {"name": "Food", "sap_code": "10001"},
            {"name": "Transportation", "sap_code": "10002"},
            {"name": "Accommodation", "sap_code": "10003"},
            {"name": "Communication", "sap_code": "10004"},
            {"name": "Materials", "sap_code": "10005"},
            {"name": "Training", "sap_code": "10006"},
        ]
        
        for cat_data in categories_data:
            existing_cat = db.query(ExpenseCategory).filter(
                ExpenseCategory.name == cat_data["name"]
            ).first()
            
            if not existing_cat:
                category = ExpenseCategory(
                    name=cat_data["name"],
                    sap_code=cat_data["sap_code"],
                    alert_amount=500.00
                )
                db.add(category)
                print(f"   ✓ Added category: {cat_data['name']} (SAP: {cat_data['sap_code']})")
        
        # 3. SUPPLIERS
        print("\n🏢 Setting up suppliers...")
        
        suppliers_data = [
            {"name": "Restaurant Central", "ruc": "20123456789", "address": "Av. Central 123"},
            {"name": "Hotel Plaza", "ruc": "20987654321", "address": "Plaza Mayor 456"},
            {"name": "Taxi Express", "ruc": "20555666777", "address": "Calle Rápida 789"},
            {"name": "Office Supplies SAC", "ruc": "20111222333", "address": "Av. Comercio 101"},
            {"name": "Tech Solutions Peru", "ruc": "20444555666", "address": "Jr. Tecnología 202"},
        ]
        
        for sup_data in suppliers_data:
            existing_supplier = db.query(Supplier).filter(
                Supplier.name == sup_data["name"]
            ).first()
            
            if not existing_supplier:
                supplier = Supplier(
                    name=sup_data["name"],
                    ruc=sup_data["ruc"],
                    address=sup_data["address"]
                )
                db.add(supplier)
                print(f"   ✓ Added supplier: {sup_data['name']}")
        
        db.flush()
        
        # 4. USERS
        print("\n👥 Setting up test users...")
        
        # Ensure super admin exists
        admin_user = db.query(User).filter(User.email == "test@test.com").first()
        if not admin_user:
            admin_user = User(
                email="test@test.com",
                name="Super",
                surname="Admin",
                password=hash_password("admin123"),
                sap_code="ADM001",
                country_id=peru.id,
                cost_center="CC001",
                profile="treasury",
                is_superuser=True,
                is_approver=True,
                force_password_change=False
            )
            db.add(admin_user)
            print("   ✓ Added Super Admin (test@test.com)")
        
        # Add regular users for testing
        users_data = [
            {
                "email": "manager@test.com",
                "name": "John",
                "surname": "Manager",
                "password": "manager123",
                "sap_code": "MGR001",
                "country_id": peru.id,
                "cost_center": "CC002",
                "profile": "manager",
                "is_approver": True
            },
            {
                "email": "employee@test.com",
                "name": "Jane",
                "surname": "Employee",
                "password": "employee123",
                "sap_code": "EMP001",
                "country_id": peru.id,
                "cost_center": "CC003",
                "profile": "employee",
                "is_approver": False
            },
            {
                "email": "chile.user@test.com",
                "name": "Carlos",
                "surname": "Chilean",
                "password": "chile123",
                "sap_code": "CHL001",
                "country_id": chile.id,
                "cost_center": "CC004",
                "profile": "employee",
                "is_approver": False
            }
        ]
        
        for user_data in users_data:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing_user:
                user = User(
                    email=user_data["email"],
                    name=user_data["name"],
                    surname=user_data["surname"],
                    password=hash_password(user_data["password"]),
                    sap_code=user_data["sap_code"],
                    country_id=user_data["country_id"],
                    cost_center=user_data["cost_center"],
                    profile=user_data["profile"],
                    is_superuser=False,
                    is_approver=user_data["is_approver"],
                    force_password_change=False
                )
                db.add(user)
                print(f"   ✓ Added user: {user_data['email']} ({user_data['name']} {user_data['surname']})")
        
        db.flush()
        
        # 5. PREPAYMENTS (Sample data)
        print("\n💰 Setting up sample prepayments...")
        
        employee_user = db.query(User).filter(User.email == "employee@test.com").first()
        if employee_user:
            existing_prepayment = db.query(Prepayment).filter(
                Prepayment.user_id == employee_user.id
            ).first()
            
            if not existing_prepayment:
                prepayment = Prepayment(
                    user_id=employee_user.id,
                    purpose="Business trip to Lima",
                    amount=1500.00,
                    destination=peru.name,
                    currency=peru.currency,
                    start_date=date(2025, 9, 1),
                    end_date=date(2025, 9, 5),
                    comments="Customer meetings and training",
                    status="approved"
                )
                db.add(prepayment)
                print("   ✓ Added sample prepayment for employee@test.com")
        
        # Commit all changes
        db.commit()
        
        # 6. SUMMARY
        print("\n🎉 Test data setup completed!")
        print("\n📋 Summary:")
        
        users_count = db.query(User).count()
        countries_count = db.query(Country).count()
        categories_count = db.query(ExpenseCategory).count()
        suppliers_count = db.query(Supplier).count()
        prepayments_count = db.query(Prepayment).count()
        
        print(f"   • Users: {users_count}")
        print(f"   • Countries: {countries_count}")
        print(f"   • Expense Categories: {categories_count}")
        print(f"   • Suppliers: {suppliers_count}")
        print(f"   • Prepayments: {prepayments_count}")
        
        print("\n🔐 Test Login Credentials:")
        print("   📧 Super Admin: test@test.com / admin123")
        print("   📧 Manager: manager@test.com / manager123")
        print("   📧 Employee: employee@test.com / employee123")
        print("   📧 Chile User: chile.user@test.com / chile123")
        
        print("\n✨ Your test environment is ready!")
        
    except Exception as e:
        print(f"❌ Error setting up test data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    setup_test_data()

