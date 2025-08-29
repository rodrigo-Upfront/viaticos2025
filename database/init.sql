-- Viaticos 2025 Database Initialization Script
-- This script will be executed when the PostgreSQL container starts

-- Create the main database if it doesn't exist
-- (The database is already created by POSTGRES_DB environment variable)

-- Initial data for testing
-- This will be populated by the application startup process

-- Ensure proper extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes (these will be created by SQLAlchemy, but we can pre-create some for performance)
-- The actual table creation is handled by SQLAlchemy models

