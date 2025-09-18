"""
Viaticos 2025 - Travel Expense Management System
Main FastAPI Application
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer
import uvicorn
import os
from contextlib import asynccontextmanager

# Import modules
from app.database.connection import engine, get_db
from app.models import models
from app.routers import (
    auth, users, countries, categories, suppliers, currencies,
    prepayments, expense_reports, expenses, approvals, dashboard, category_alerts, mfa, locations
)
from app.core.config import settings
from sqlalchemy import text


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting Viaticos 2025...")
    
    # Create database tables
    models.Base.metadata.create_all(bind=engine)
    print("📊 Database tables created")
    
    # Ensure DB enums include new RequestStatus values
    try:
        with engine.connect() as conn:
            # Add new enum values if they do not exist (PostgreSQL specific)
            # Some databases may have used enum names (uppercase) as labels; ensure both cases exist
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'supervisor_pending'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'accounting_pending'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'treasury_pending'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'approved_for_reimbursement'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'funds_return_pending'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'SUPERVISOR_PENDING'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'ACCOUNTING_PENDING'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'TREASURY_PENDING'"))
            conn.commit()
            print("✅ Ensured RequestStatus enum values present")

            # Ensure currency master and columns exist (idempotent startup migration)
            try:
                # Create currencies table if missing
                conn.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS currencies (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) UNIQUE NOT NULL,
                        code VARCHAR(10) UNIQUE NOT NULL,
                        symbol VARCHAR(10)
                    );
                    """
                ))
                # Seed a minimal set (safe due to ON CONFLICT)
                conn.execute(text(
                    """
                    INSERT INTO currencies (name, code, symbol) VALUES
                      ('Peruvian Sol','PEN','S/'),
                      ('US Dollar','USD','$'),
                      ('Chilean Peso','CLP','$'),
                      ('Euro','EUR','€'),
                      ('Mexican Peso','MXN','$'),
                      ('Colombian Peso','COP','$'),
                      ('Brazilian Real','BRL','R$'),
                      ('Argentine Peso','ARS','$')
                    ON CONFLICT (code) DO NOTHING;
                    """
                ))

                # Add currency_id columns if missing
                conn.execute(text("ALTER TABLE prepayments ADD COLUMN IF NOT EXISTS currency_id INTEGER"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency_id INTEGER"))

                # Backfill from legacy 'currency' columns when present
                conn.execute(text(
                    """
                    UPDATE prepayments p
                    SET currency_id = c.id
                    FROM currencies c
                    WHERE p.currency_id IS NULL
                      AND (
                        (SELECT COUNT(*) FROM information_schema.columns 
                         WHERE table_name='prepayments' AND column_name='currency') > 0
                      )
                      AND (p.currency = c.code OR p.currency = c.name);
                    """
                ))
                conn.execute(text(
                    """
                    UPDATE expenses e
                    SET currency_id = c.id
                    FROM currencies c
                    WHERE e.currency_id IS NULL
                      AND (
                        (SELECT COUNT(*) FROM information_schema.columns 
                         WHERE table_name='expenses' AND column_name='currency') > 0
                      )
                      AND (e.currency = c.code OR e.currency = c.name);
                    """
                ))

                # Default to USD if still null
                conn.execute(text(
                    "UPDATE prepayments SET currency_id = (SELECT id FROM currencies WHERE code='USD' LIMIT 1) WHERE currency_id IS NULL"
                ))
                conn.execute(text(
                    "UPDATE expenses SET currency_id = (SELECT id FROM currencies WHERE code='USD' LIMIT 1) WHERE currency_id IS NULL"
                ))

                # Drop legacy currency columns if exist
                conn.execute(text(
                    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prepayments' AND column_name='currency') THEN ALTER TABLE prepayments DROP COLUMN currency; END IF; END $$;"
                ))
                conn.execute(text(
                    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='currency') THEN ALTER TABLE expenses DROP COLUMN currency; END IF; END $$;"
                ))
                conn.execute(text(
                    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='currency') THEN ALTER TABLE countries DROP COLUMN currency; END IF; END $$;"
                ))

                # Add FKs and NOT NULL (ignore if already present)
                conn.execute(text(
                    "DO $$ BEGIN ALTER TABLE prepayments ADD CONSTRAINT IF NOT EXISTS fk_prepay_currency FOREIGN KEY (currency_id) REFERENCES currencies(id); EXCEPTION WHEN others THEN NULL; END $$;"
                ))
                conn.execute(text(
                    "DO $$ BEGIN ALTER TABLE expenses ADD CONSTRAINT IF NOT EXISTS fk_expense_currency FOREIGN KEY (currency_id) REFERENCES currencies(id); EXCEPTION WHEN others THEN NULL; END $$;"
                ))
                try:
                    conn.execute(text("ALTER TABLE prepayments ALTER COLUMN currency_id SET NOT NULL"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE expenses ALTER COLUMN currency_id SET NOT NULL"))
                except Exception:
                    pass
                conn.commit()
                print("✅ Ensured currency master and columns present")
            except Exception as e:
                print(f"⚠️ Skipped currency migration: {e}")

            # Lightweight migration for reimbursements: make expenses.travel_expense_report_id nullable and add created_by_user_id if missing
            try:
                conn.execute(text("ALTER TABLE expenses ALTER COLUMN travel_expense_report_id DROP NOT NULL"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id)"))
            except Exception:
                pass
            # TravelExpenseReport adjustments for reimbursements
            dialect = engine.dialect.name
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ALTER COLUMN prepayment_id DROP NOT NULL"))
            except Exception:
                pass
            if dialect == 'postgresql':
                try:
                    conn.execute(text("CREATE TYPE reporttype AS ENUM ('PREPAYMENT','REIMBURSEMENT')"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS report_type reporttype DEFAULT 'PREPAYMENT' NOT NULL"))
                except Exception:
                    pass
            else:
                # Fallback for SQLite and others: use TEXT
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN report_type TEXT DEFAULT 'PREPAYMENT' NOT NULL"))
                except Exception:
                    pass
                # If above failed (older SQLite), try without default/constraint and backfill
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN report_type TEXT"))
                except Exception:
                    pass
                try:
                    conn.execute(text("UPDATE travel_expense_reports SET report_type='PREPAYMENT' WHERE report_type IS NULL"))
                except Exception:
                    pass
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS reason TEXT"))
            except Exception:
                # SQLite fallback without IF NOT EXISTS
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN reason TEXT"))
                except Exception:
                    pass
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id)"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN country_id INTEGER"))
                except Exception:
                    pass
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id)"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN currency_id INTEGER"))
                except Exception:
                    pass
            # Add rejection_reason to prepayments if missing
            try:
                conn.execute(text("ALTER TABLE prepayments ADD COLUMN IF NOT EXISTS rejection_reason TEXT"))
            except Exception:
                pass
            # Add trip dates for reimbursement reports
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS start_date DATE"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS end_date DATE"))
            except Exception:
                pass
            # Add rejection reason for expense-level rejections
            try:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300)"))
            except Exception:
                pass
            # Add expense rejections column to approval history
            try:
                conn.execute(text("ALTER TABLE approval_history ADD COLUMN IF NOT EXISTS expense_rejections TEXT"))
            except Exception:
                pass
            
            # Add currency_id to category_country_alerts if missing
            try:
                conn.execute(text("ALTER TABLE category_country_alerts ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id)"))
                # Update unique constraint to include currency_id
                conn.execute(text("ALTER TABLE category_country_alerts DROP CONSTRAINT IF EXISTS _category_country_alert_uc"))
                conn.execute(text("ALTER TABLE category_country_alerts ADD CONSTRAINT _category_country_currency_alert_uc UNIQUE (category_id, country_id, currency_id)"))
            except Exception:
                pass
            
            conn.commit()
            print("✅ Expense table supports reimbursements")
    except Exception as e:
        # Non-fatal: log and continue (helps on SQLite or first-time setups)
        print(f"⚠️ Skipped enum migration: {e}")
    
    # Create storage directories; fallback to local ./storage if default is not writable
    try:
        os.makedirs(settings.UPLOAD_PATH, exist_ok=True)
        os.makedirs(settings.EXPORT_PATH, exist_ok=True)
        print(f"📁 Storage directories created: {settings.UPLOAD_PATH}")
    except Exception as e:
        local_upload = os.path.abspath("storage/uploads")
        local_export = os.path.abspath("storage/exports")
        os.makedirs(local_upload, exist_ok=True)
        os.makedirs(local_export, exist_ok=True)
        print(f"📁 Using local storage directories due to error: {e}")
    
    yield
    
    # Shutdown
    print("🔥 Shutting down Viaticos 2025...")


# Create FastAPI application
app = FastAPI(
    title="Viaticos 2025 API",
    description="Travel Expense Management System API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for broader device compatibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(countries.router, prefix="/api/countries", tags=["Countries"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(currencies.router, prefix="/api/currencies", tags=["Currencies"])
app.include_router(prepayments.router, prefix="/api/prepayments", tags=["Prepayments"])
app.include_router(expense_reports.router, prefix="/api/expense-reports", tags=["Expense Reports"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(category_alerts.router, prefix="/api", tags=["Category Alerts"])
app.include_router(mfa.router, prefix="/api/mfa", tags=["Multi-Factor Authentication"])
app.include_router(locations.router, prefix="/api", tags=["Locations"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Viaticos 2025 API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "viaticos-2025-api",
        "version": "1.0.2"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

