# Email Toggle Feature Guide

## Overview

The email notification system can be easily turned ON or OFF through a **toggle switch in the UI**.

**🔴 IMPORTANT: Emails are currently DISABLED by default (run the SQL script to disable them)**

## How It Works

The system uses a two-level toggle system:

1. **UI Toggle (PRIMARY)**: `is_active` field in SMTP settings - **This is what you use!**
2. **Environment Variable (OPTIONAL)**: `EMAIL_ENABLED` - Deployment-level override (default: `true`)

The email system checks the UI toggle first, then the environment variable.

## No Database Changes Required

✅ **This feature uses only:**
- Existing SMTP settings table fields (already in database - no schema changes)
- A prominent toggle switch in the SMTP Settings UI
- Code-level checks (no migrations needed)

❌ **This feature does NOT:**
- Create new database tables
- Modify existing database schema
- Delete any data
- Require migrations

## How to Turn Emails ON/OFF (UI Method - RECOMMENDED)

### Step 1: Navigate to SMTP Settings

Go to **Admin Menu → SMTP Settings** in your application.

### Step 2: Use the Toggle Switch

You'll see a prominent box at the top:

```
📧 Email Notifications                        [OFF/ON Toggle Switch]
🔴 Emails are currently DISABLED - No emails will be sent
```

Simply **click the toggle switch** to turn emails ON or OFF.

- **ON** (green background): ✅ Emails are enabled - System will send notifications
- **OFF** (gray background): 🔴 Emails are disabled - No emails will be sent

**Changes take effect immediately - no restart required!**

## Initial Setup (First Time)

### 1. Disable Emails by Default

Run this SQL script to ensure emails start disabled:

```bash
psql -U postgres -d viaticos -f disable_emails_by_default.sql
```

Or manually:
```sql
UPDATE smtp_settings SET is_active = false WHERE is_active = true;
```

### 2. Configure SMTP Settings

1. Go to SMTP Settings page
2. Enter your SMTP server details (host, port, credentials)
3. Save the configuration
4. **Leave the toggle OFF for now**

### 3. Test Email Configuration

1. Click "Send Test Email" button
2. Enter your email address
3. Send test email
4. Verify you receive it

### 4. Enable Emails When Ready

Toggle the switch to **ON** when you're ready to start sending emails.

## Advanced: Environment Variable Override (Optional)

For deployment-level control (e.g., disable emails across all environments), you can use the `EMAIL_ENABLED` environment variable:

### To Disable at Deployment Level:

Edit your docker-compose file:
```yaml
environment:
  - EMAIL_ENABLED=false  # This overrides the UI toggle
```

Restart:
```bash
docker-compose restart backend
```

**Note**: When `EMAIL_ENABLED=false`, emails won't send even if the UI toggle is ON.

### Current Status:

All docker-compose files have `EMAIL_ENABLED=true` (default):
- ✅ `docker-compose.yml` (development)
- ✅ `docker-compose.prod.yml` (production)
- ✅ `docker-compose.qa.yml` (QA)
- ✅ `docker-compose.fast.yml` (fast)
- ✅ `docker-compose.hotreload.yml` (hotreload)

## Test Email Feature

The "Send Test Email" feature works even when emails are disabled - this allows you to test your SMTP configuration before enabling emails.

## Logging

When emails are disabled, you'll see log messages like:
```
📧 Email sending is DISABLED (SMTP is_active=false). Skipping email to user@example.com
```

## What Gets Emailed

When enabled, emails are sent automatically for:
- Report approvals
- Report rejections  
- Payment notifications
- Prepayment approvals/rejections
- Other system events

## Safety

- ✅ Email notifications are queued in the `email_notifications` table regardless of this setting
- ✅ When you enable emails, the system will process pending notifications
- ✅ You can review queued emails in the Email Notifications page before enabling
- ✅ Disabling emails does not delete the queue - it just prevents sending
- ✅ **No database changes required** - uses existing fields

