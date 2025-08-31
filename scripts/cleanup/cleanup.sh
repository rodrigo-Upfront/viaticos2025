#!/bin/bash

# =========================================
# VIATICOS 2025 - DATA CLEANUP UTILITY
# =========================================
# Interactive script for cleaning up test data
# Provides multiple cleanup options with safety confirmations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}  VIATICOS 2025 - DATA CLEANUP UTILITY  ${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
}

print_warning() {
    echo -e "${RED}⚠️  WARNING: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}📝 $1${NC}"
}

confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}❌ Operation cancelled.${NC}"
        exit 1
    fi
}

check_database() {
    if ! docker exec viaticos_db pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${RED}❌ Database is not running. Please start the database first.${NC}"
        echo "Run: docker compose up -d"
        exit 1
    fi
    print_success "Database is running"
}

show_current_data() {
    echo -e "${BLUE}📊 Current data counts:${NC}"
    docker exec -i viaticos_db psql -U postgres -d viaticos -q <<EOF
SELECT 
    'Prepayments' as table_name, 
    COUNT(*) as count 
FROM prepayments
UNION ALL
SELECT 'Travel Expense Reports', COUNT(*) FROM travel_expense_reports
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Approvals', COUNT(*) FROM approvals
UNION ALL
SELECT 'Approval History', COUNT(*) FROM approval_history
ORDER BY table_name;
EOF
    echo ""
}

cleanup_all_data() {
    print_warning "This will delete ALL transactional data!"
    print_info "Master data (users, categories, countries, etc.) will be preserved."
    echo ""
    show_current_data
    confirm_action "Do you want to reset ALL transactional data?"
    
    echo -e "${BLUE}🧹 Running complete data reset...${NC}"
    docker exec -i viaticos_db psql -U postgres -d viaticos < scripts/cleanup/reset_all_data.sql
    print_success "Complete data reset finished!"
}

cleanup_specific_data() {
    echo -e "${BLUE}🎯 Selective cleanup options:${NC}"
    echo "1. Reset expenses and approvals only (keep prepayments/reports)"
    echo "2. Reset reports and related data (keep prepayments)"
    echo "3. Reset prepayments and all related data"
    echo "4. Reset approval data only (reset statuses to pending)"
    echo "5. Custom cleanup (edit SQL file manually)"
    echo ""
    
    read -p "Choose option (1-5): " option
    
    case $option in
        1)
            cleanup_expenses_only
            ;;
        2)
            cleanup_reports_only
            ;;
        3)
            cleanup_prepayments_all
            ;;
        4)
            cleanup_approvals_only
            ;;
        5)
            print_info "Please edit scripts/cleanup/reset_specific_data.sql and run it manually"
            echo "Command: docker exec -i viaticos_db psql -U postgres -d viaticos < scripts/cleanup/reset_specific_data.sql"
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            exit 1
            ;;
    esac
}

cleanup_expenses_only() {
    print_warning "This will delete all expenses and their approvals"
    print_info "Prepayments and reports will be preserved"
    confirm_action "Proceed with expenses cleanup?"
    
    docker exec -i viaticos_db psql -U postgres -d viaticos -q <<EOF
DELETE FROM expense_rejection_history WHERE expense_id IN (SELECT id FROM expenses);
DELETE FROM approval_history WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM approvals WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM expenses;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
EOF
    print_success "Expenses cleanup completed!"
}

cleanup_reports_only() {
    print_warning "This will delete all reports, expenses, and related approvals"
    print_info "Prepayments will be preserved"
    confirm_action "Proceed with reports cleanup?"
    
    docker exec -i viaticos_db psql -U postgres -d viaticos -q <<EOF
DELETE FROM expense_rejection_history;
DELETE FROM approval_history WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM approvals WHERE entity_type = 'TRAVEL_EXPENSE_REPORT';
DELETE FROM expenses;
DELETE FROM travel_expense_reports;
ALTER SEQUENCE travel_expense_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
EOF
    print_success "Reports cleanup completed!"
}

cleanup_prepayments_all() {
    print_warning "This will delete ALL prepayments and related data"
    print_info "This is equivalent to a complete reset"
    confirm_action "Proceed with prepayments cleanup?"
    
    cleanup_all_data
}

cleanup_approvals_only() {
    print_warning "This will reset all approval data and statuses"
    print_info "Business data (prepayments, reports, expenses) will be preserved but reset to pending"
    confirm_action "Proceed with approvals reset?"
    
    docker exec -i viaticos_db psql -U postgres -d viaticos -q <<EOF
DELETE FROM expense_rejection_history;
DELETE FROM approval_history;
DELETE FROM approvals;
UPDATE travel_expense_reports SET status = 'pending', updated_at = NOW();
UPDATE prepayments SET status = 'pending', updated_at = NOW();
UPDATE expenses SET status = 'pending', updated_at = NOW(), rejection_reason = NULL;
EOF
    print_success "Approvals reset completed! All items are now in pending status."
}

backup_data() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${BLUE}💾 Creating backup: $backup_file${NC}"
    
    docker exec viaticos_db pg_dump -U postgres viaticos > "backups/$backup_file"
    print_success "Backup created: backups/$backup_file"
}

# Main menu
main_menu() {
    print_header
    check_database
    
    # Create backups directory if it doesn't exist
    mkdir -p backups
    
    echo "What would you like to do?"
    echo ""
    echo "1. 🧹 Complete data reset (recommended for fresh testing)"
    echo "2. 🎯 Selective cleanup (choose specific data to reset)"
    echo "3. 💾 Create backup only"
    echo "4. 📊 Show current data counts"
    echo "5. ❌ Exit"
    echo ""
    
    read -p "Choose option (1-5): " choice
    
    case $choice in
        1)
            echo ""
            cleanup_all_data
            ;;
        2)
            echo ""
            cleanup_specific_data
            ;;
        3)
            echo ""
            backup_data
            ;;
        4)
            echo ""
            show_current_data
            ;;
        5)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please choose 1-5.${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Operation completed successfully!"
    echo ""
    echo "Current status:"
    show_current_data
}

# Run main menu
main_menu
