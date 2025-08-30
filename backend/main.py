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
    prepayments, expense_reports, expenses, approvals, dashboard
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
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'SUPERVISOR_PENDING'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'ACCOUNTING_PENDING'"))
            conn.execute(text("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'TREASURY_PENDING'"))
            conn.commit()
            print("✅ Ensured RequestStatus enum values present")

            # Lightweight migration for reimbursements: make expenses.travel_expense_report_id nullable and add created_by_user_id if missing
            try:
                conn.execute(text("ALTER TABLE expenses ALTER COLUMN travel_expense_report_id DROP NOT NULL"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id)"))
            except Exception:
                pass
            conn.commit()
            print("✅ Expense table supports reimbursements")
    except Exception as e:
        # Non-fatal: log and continue (helps on SQLite or first-time setups)
        print(f"⚠️ Skipped enum migration: {e}")
    
    # Create storage directories
    os.makedirs(settings.UPLOAD_PATH, exist_ok=True)
    os.makedirs(settings.EXPORT_PATH, exist_ok=True)
    print(f"📁 Storage directories created: {settings.UPLOAD_PATH}")
    
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
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
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
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

