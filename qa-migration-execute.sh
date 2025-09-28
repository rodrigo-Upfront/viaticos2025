#!/bin/bash

# QA Migration Execution Script
# This script executes the QA migration in the correct order with proper error handling

set -e  # Exit on any error

# Configuration
DB_HOST="${DB_HOST:-161.35.39.205}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-viaticos}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-viaticos2025}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required files exist
check_files() {
    log "Checking migration files..."
    
    local files=(
        "qa-migration-01-schema-updates.sql"
        "qa-migration-02-email-system.sql"
        "qa-migration-03-verification.sql"
    )
    
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Migration file not found: $file"
            exit 1
        fi
    done
    
    success "All migration files found"
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database connection successful"
    else
        error "Failed to connect to database"
        error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
}

# Create backup
create_backup() {
    log "Creating database backup..."
    
    local backup_file="qa-backup-$(date +'%Y%m%d_%H%M%S').sql"
    
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$backup_file"; then
        success "Backup created: $backup_file"
        echo "BACKUP_FILE=$backup_file" > .migration_backup_info
    else
        error "Failed to create backup"
        exit 1
    fi
}

# Execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    log "Executing: $description"
    log "File: $file"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"; then
        success "Completed: $description"
    else
        error "Failed: $description"
        error "Check the output above for details"
        exit 1
    fi
}

# Main migration execution
execute_migration() {
    log "Starting QA migration..."
    
    # Step 1: Schema Updates
    execute_sql "qa-migration-01-schema-updates.sql" "Schema updates for existing tables"
    
    # Step 2: Email System
    execute_sql "qa-migration-02-email-system.sql" "Email system tables and data"
    
    # Step 3: Verification
    execute_sql "qa-migration-03-verification.sql" "Migration verification and testing"
    
    success "QA migration completed successfully!"
}

# Show migration summary
show_summary() {
    log "Migration Summary:"
    echo "=================="
    echo "✅ Schema updates applied to existing tables"
    echo "✅ Email system tables created"
    echo "✅ Default email templates and SMTP settings added"
    echo "✅ All verifications passed"
    echo ""
    echo "New functionality available:"
    echo "- Email notifications for prepayment approvals"
    echo "- Email template management"
    echo "- SMTP configuration"
    echo "- Email logs and monitoring"
    echo ""
    echo "Next steps:"
    echo "1. Update QA environment variables if needed"
    echo "2. Configure SMTP settings via admin panel"
    echo "3. Test email functionality"
    echo "4. Deploy frontend changes"
}

# Rollback function
rollback() {
    warning "Rolling back migration..."
    
    if [[ -f ".migration_backup_info" ]]; then
        source .migration_backup_info
        if [[ -f "$BACKUP_FILE" ]]; then
            log "Restoring from backup: $BACKUP_FILE"
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"; then
                success "Rollback completed successfully"
            else
                error "Rollback failed"
                exit 1
            fi
        else
            error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
    else
        error "No backup information found"
        exit 1
    fi
}

# Help function
show_help() {
    echo "QA Migration Script"
    echo "==================="
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  migrate     Execute the migration (default)"
    echo "  rollback    Rollback the migration using backup"
    echo "  test        Test database connection only"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST     Database host (default: 161.35.39.205)"
    echo "  DB_PORT     Database port (default: 5432)"
    echo "  DB_NAME     Database name (default: viaticos)"
    echo "  DB_USER     Database user (default: postgres)"
    echo "  DB_PASSWORD Database password (default: viaticos2025)"
    echo ""
    echo "Examples:"
    echo "  $0 migrate"
    echo "  DB_HOST=localhost $0 test"
    echo "  $0 rollback"
}

# Main script logic
main() {
    local action=${1:-migrate}
    
    case $action in
        migrate)
            log "Starting QA migration process..."
            check_files
            test_connection
            create_backup
            execute_migration
            show_summary
            ;;
        rollback)
            log "Starting rollback process..."
            test_connection
            rollback
            ;;
        test)
            test_connection
            ;;
        help)
            show_help
            ;;
        *)
            error "Unknown action: $action"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
