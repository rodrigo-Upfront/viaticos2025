# QA Migration Guide - Email Functionality

## Overview

This migration safely adds email functionality to the QA environment without affecting existing data. Unlike the localhost approach that deleted everything, this preserves all existing QA data while adding new features.

## What This Migration Does

### ✅ **Safe Changes (No Data Loss)**
- **Creates new email tables**: `email_templates`, `email_notifications`, `smtp_settings`
- **Adds columns to existing tables**: All additions use `IF NOT EXISTS` and have safe defaults
- **Fixes schema issues**: Resolves validation problems found during localhost testing
- **Preserves all existing data**: No deletions or destructive changes

### 📊 **New Functionality Added**
- Email notifications for prepayment approvals/rejections
- Configurable email templates (bilingual: Spanish/English)
- SMTP settings management
- Email logs and monitoring
- Template variable system for dynamic content

## Migration Files

| File | Purpose | Risk Level |
|------|---------|------------|
| `qa-migration-01-schema-updates.sql` | Updates existing tables | 🟡 Low |
| `qa-migration-02-email-system.sql` | Creates email tables | 🟢 None |
| `qa-migration-03-verification.sql` | Verifies migration | 🟢 None |
| `qa-migration-rollback.sql` | Rollback script | 🟡 Low |
| `qa-migration-execute.sh` | Automated execution | 🟢 None |

## Pre-Migration Checklist

- [ ] **Backup QA database** (script does this automatically)
- [ ] **Coordinate maintenance window** with team
- [ ] **Verify QA database access** credentials
- [ ] **Test on database copy** first (recommended)
- [ ] **Review migration files** for any environment-specific changes

## Execution Steps

### Option 1: Automated Execution (Recommended)

```bash
# Test connection first
./qa-migration-execute.sh test

# Execute migration with automatic backup
./qa-migration-execute.sh migrate

# If needed, rollback
./qa-migration-execute.sh rollback
```

### Option 2: Manual Execution

```bash
# 1. Create backup
pg_dump -h 161.35.39.205 -U postgres -d viaticos > qa-backup-$(date +%Y%m%d).sql

# 2. Execute migrations in order
psql -h 161.35.39.205 -U postgres -d viaticos -f qa-migration-01-schema-updates.sql
psql -h 161.35.39.205 -U postgres -d viaticos -f qa-migration-02-email-system.sql
psql -h 161.35.39.205 -U postgres -d viaticos -f qa-migration-03-verification.sql
```

## Schema Changes Detail

### Existing Tables Modified

| Table | Column Added | Type | Default | Impact |
|-------|-------------|------|---------|---------|
| `factura_suppliers` | `tax_name` | VARCHAR(200) | supplier name | Low - adds missing validation field |
| `approval_history` | `expense_rejections` | TEXT | NULL | None - new feature |
| `category_country_alerts` | `currency_id` | INTEGER | NULL | Low - enhances alerts |
| `category_country_alerts` | `alert_message` | TEXT | NULL | None - new feature |
| `travel_expense_reports` | `reason` | TEXT | NULL | None - for reimbursements |
| `travel_expense_reports` | `country_id` | INTEGER | NULL | None - for reimbursements |
| `travel_expense_reports` | `currency_id` | INTEGER | NULL | None - for reimbursements |
| `travel_expense_reports` | `start_date` | DATE | NULL | None - for reimbursements |
| `travel_expense_reports` | `end_date` | DATE | NULL | None - for reimbursements |
| `prepayments` | `rejection_reason` | TEXT | NULL | None - new feature |
| `expenses` | `rejection_reason` | VARCHAR(300) | NULL | None - new feature |

### New Tables Created

| Table | Purpose | Records |
|-------|---------|---------|
| `email_templates` | Bilingual email templates | ~6 default templates |
| `email_notifications` | Email queue/log | 0 (starts empty) |
| `smtp_settings` | SMTP configuration | 1 default config |

## Post-Migration Steps

### 1. **Verify Migration Success**
```bash
# Check that verification passed
psql -h 161.35.39.205 -U postgres -d viaticos -c "SELECT COUNT(*) FROM email_templates;"
# Should return 6 or more

psql -h 161.35.39.205 -U postgres -d viaticos -c "SELECT COUNT(*) FROM smtp_settings;"
# Should return 1
```

### 2. **Configure SMTP Settings**
- Access QA admin panel
- Navigate to Email Settings
- Configure production SMTP settings
- Test email functionality

### 3. **Deploy Frontend Changes**
- Deploy latest frontend code with email features
- Test email notifications end-to-end
- Verify email templates render correctly

### 4. **Monitor Email System**
- Check email logs for any issues
- Verify email delivery
- Monitor system performance

## Rollback Plan

### Automatic Rollback
```bash
./qa-migration-execute.sh rollback
```

### Manual Rollback
```bash
# Restore from backup
psql -h 161.35.39.205 -U postgres -d viaticos < qa-backup-YYYYMMDD.sql
```

### Partial Rollback
If only email tables need to be removed:
```sql
DROP TABLE IF EXISTS email_notifications CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS smtp_settings CASCADE;
```

## Risk Assessment

### 🟢 **Low Risk Items**
- New table creation (email system)
- Column additions with defaults
- Index creation
- Default data insertion

### 🟡 **Medium Risk Items**
- Constraint updates (unique constraints)
- Data cleanup (empty tax_name values)
- Column nullability changes

### 🔴 **High Risk Items**
- None in this migration

## Troubleshooting

### Common Issues

**Issue**: Migration fails on constraint creation
**Solution**: Check for existing data conflicts, clean up manually

**Issue**: Email templates not created
**Solution**: Check for unique constraint violations, run template insertion separately

**Issue**: SMTP settings not working
**Solution**: Update SMTP configuration via admin panel

### Support Contacts
- Database issues: Check with DBA team
- Application issues: Development team
- Infrastructure: DevOps team

## Testing Checklist

After migration completion:

- [ ] **Existing functionality works** (prepayments, expenses, approvals)
- [ ] **New email tables accessible** via admin panel
- [ ] **Email notifications trigger** on prepayment actions
- [ ] **SMTP settings configurable** via UI
- [ ] **Email templates editable** via admin interface
- [ ] **No performance degradation** observed
- [ ] **All existing data intact** and accessible

## Environment Variables

Update QA environment if needed:
```bash
# Email service configuration
EMAIL_ENABLED=true
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

## Success Criteria

Migration is considered successful when:
1. All verification checks pass ✅
2. Existing functionality unchanged ✅
3. Email system accessible ✅
4. No data loss occurred ✅
5. Performance remains stable ✅
