# 🧹 Viaticos 2025 - Data Cleanup System

This directory contains comprehensive data cleanup tools for the Viaticos 2025 system.

## 📁 Files Overview

### Main Scripts
- **`cleanup.sh`** - Interactive cleanup utility with multiple options
- **`reset_all_data.sql`** - Complete data reset (preserves master data)
- **`reset_specific_data.sql`** - Selective cleanup options

## 🚀 Quick Start

### Option 1: Interactive Cleanup (Recommended)
```bash
# Make script executable first
chmod +x scripts/cleanup/cleanup.sh

# Run interactive cleanup
./scripts/cleanup/cleanup.sh
```

### Option 2: Direct SQL Execution
```bash
# Complete reset
docker exec -i viaticos_db psql -U postgres -d viaticos < scripts/cleanup/reset_all_data.sql

# Selective reset (edit file first to uncomment desired option)
docker exec -i viaticos_db psql -U postgres -d viaticos < scripts/cleanup/reset_specific_data.sql
```

## 🎯 Cleanup Options

### 1. Complete Data Reset
- **What it does**: Removes ALL transactional data
- **Preserves**: Users, categories, countries, currencies, suppliers
- **Removes**: Prepayments, reports, expenses, approvals, history
- **Use case**: Fresh start for testing

### 2. Selective Cleanup Options
- **Expenses Only**: Remove expenses and their approvals (keep reports/prepayments)
- **Reports Only**: Remove reports and related data (keep prepayments)
- **Prepayments All**: Remove prepayments and everything related
- **Approvals Only**: Reset approval statuses to pending (keep business data)

## 🛡️ Safety Features

- **Database connectivity check** before running
- **Current data counts** display before cleanup
- **Confirmation prompts** for destructive operations
- **Backup creation** option
- **Foreign key integrity** maintained during cleanup
- **Sequence reset** to start IDs from 1

## 📊 What Gets Preserved vs Removed

### ✅ Always Preserved (Master Data)
- Users and authentication data
- Expense categories
- Countries
- Currencies
- Suppliers
- System configuration

### 🗑️ Removed (Transactional Data)
- Prepayments
- Travel expense reports
- Expenses
- Approvals and approval history
- Expense rejection history

## 🔧 Usage Examples

### After Testing New Features
```bash
# Complete cleanup for fresh start
./scripts/cleanup/cleanup.sh
# Choose option 1 (Complete data reset)
```

### Reset Only Approval Flow
```bash
# Reset approvals but keep business data
./scripts/cleanup/cleanup.sh
# Choose option 2, then option 4 (Reset approvals only)
```

### Create Backup Before Cleanup
```bash
# Always good practice
./scripts/cleanup/cleanup.sh
# Choose option 3 (Create backup)
# Then run desired cleanup
```

## ⚠️ Important Notes

1. **Always backup** before major cleanup operations
2. **Stop application** if running heavy cleanup operations
3. **Database must be running** (docker compose up -d)
4. **Cannot undo** - cleanup operations are permanent
5. **Test in development** before using in production

## 🆘 Emergency Recovery

If you need to restore data after cleanup:

```bash
# Restore from backup (if created)
docker exec -i viaticos_db psql -U postgres -d viaticos < backups/backup_YYYYMMDD_HHMMSS.sql

# Or recreate initial test data
python backend/create_initial_data.py
```

## 📝 Customization

Edit `reset_specific_data.sql` to create custom cleanup scenarios by uncommenting/modifying the SQL blocks for your specific needs.

---

**Ready to use after your manual verification testing is complete! 🎉**
