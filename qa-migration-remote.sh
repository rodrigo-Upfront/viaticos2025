#!/bin/bash

# QA Migration Remote Execution Script
# This script connects to the QA server and executes the migration there

set -e  # Exit on any error

# Configuration
QA_SERVER="${QA_SERVER:-161.35.39.205}"
QA_USER="${QA_USER:-root}"
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

# Test SSH connection
test_ssh() {
    log "Testing SSH connection to QA server..."
    
    if ssh -o ConnectTimeout=10 "$QA_USER@$QA_SERVER" "echo 'SSH connection successful'"; then
        success "SSH connection to QA server successful"
    else
        error "Failed to connect to QA server via SSH"
        error "Server: $QA_SERVER, User: $QA_USER"
        exit 1
    fi
}

# Create backup on QA server
create_backup() {
    log "Creating database backup on QA server..."
    
    local backup_file="qa-backup-$(date +'%Y%m%d_%H%M%S').sql"
    
    ssh "$QA_USER@$QA_SERVER" "
        cd /var/www/viaticos2025 &&
        docker exec viaticos_database pg_dump -U $DB_USER -d $DB_NAME > $backup_file &&
        echo 'Backup created: $backup_file' &&
        ls -lh $backup_file
    "
    
    if [ $? -eq 0 ]; then
        success "Backup created successfully: $backup_file"
        echo "BACKUP_FILE=$backup_file" > .qa_migration_backup_info
    else
        error "Failed to create backup"
        exit 1
    fi
}

# Upload migration files to QA server
upload_files() {
    log "Uploading migration files to QA server..."
    
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
    
    # Upload files to QA server
    scp "${files[@]}" "$QA_USER@$QA_SERVER:/var/www/viaticos2025/"
    
    if [ $? -eq 0 ]; then
        success "Migration files uploaded successfully"
    else
        error "Failed to upload migration files"
        exit 1
    fi
}

# Execute migration on QA server
execute_migration() {
    log "Executing migration on QA server..."
    
    ssh "$QA_USER@$QA_SERVER" "
        cd /var/www/viaticos2025 &&
        
        echo '=== Step 1: Schema Updates ===' &&
        docker exec -i viaticos_database psql -U $DB_USER -d $DB_NAME < qa-migration-01-schema-updates.sql &&
        
        echo '=== Step 2: Email System ===' &&
        docker exec -i viaticos_database psql -U $DB_USER -d $DB_NAME < qa-migration-02-email-system.sql &&
        
        echo '=== Step 3: Verification ===' &&
        docker exec -i viaticos_database psql -U $DB_USER -d $DB_NAME < qa-migration-03-verification.sql &&
        
        echo '=== Migration Complete ==='
    "
    
    if [ $? -eq 0 ]; then
        success "Migration executed successfully!"
    else
        error "Migration failed"
        exit 1
    fi
}

# Show migration summary
show_summary() {
    log "Migration Summary:"
    echo "=================="
    echo "✅ QA database backup created"
    echo "✅ Schema updates applied to existing tables"
    echo "✅ Email system tables created"
    echo "✅ Default email templates and SMTP settings added"
    echo "✅ All verifications passed"
    echo ""
    echo "Next steps:"
    echo "1. Test the QA application functionality"
    echo "2. Configure SMTP settings via admin panel"
    echo "3. Test email notifications"
    echo "4. Deploy frontend changes if needed"
}

# Rollback function
rollback() {
    warning "Rolling back migration on QA server..."
    
    if [[ -f ".qa_migration_backup_info" ]]; then
        source .qa_migration_backup_info
        
        log "Restoring from backup: $BACKUP_FILE"
        ssh "$QA_USER@$QA_SERVER" "
            cd /var/www/viaticos2025 &&
            docker exec -i viaticos_database psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE
        "
        
        if [ $? -eq 0 ]; then
            success "Rollback completed successfully"
        else
            error "Rollback failed"
            exit 1
        fi
    else
        error "No backup information found"
        exit 1
    fi
}

# Help function
show_help() {
    echo "QA Migration Remote Script"
    echo "=========================="
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  migrate     Execute the migration (default)"
    echo "  rollback    Rollback the migration using backup"
    echo "  test        Test SSH connection only"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  QA_SERVER   QA server IP (default: 161.35.39.205)"
    echo "  QA_USER     SSH user (default: root)"
    echo "  DB_NAME     Database name (default: viaticos)"
    echo "  DB_USER     Database user (default: postgres)"
    echo "  DB_PASSWORD Database password (default: viaticos2025)"
    echo ""
    echo "Examples:"
    echo "  $0 migrate"
    echo "  QA_USER=ubuntu $0 test"
    echo "  $0 rollback"
}

# Main script logic
main() {
    local action=${1:-migrate}
    
    case $action in
        migrate)
            log "Starting QA remote migration process..."
            test_ssh
            create_backup
            upload_files
            execute_migration
            show_summary
            ;;
        rollback)
            log "Starting rollback process..."
            test_ssh
            rollback
            ;;
        test)
            test_ssh
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
