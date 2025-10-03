# 📧 Quick Email Toggle Reference

## TL;DR - How to Turn Emails On/Off

### 🎯 **Method 1: UI Toggle (RECOMMENDED)**

1. Go to **SMTP Settings** page in your app
2. Find the big toggle switch at the top
3. Click it to turn emails ON or OFF
4. **Done!** No restart needed.

### 🔧 **Method 2: Disable Now (First Time)**

Run this SQL to disable emails:

```bash
psql -U postgres -d viaticos -c "UPDATE smtp_settings SET is_active = false;"
```

## Current Status

- ✅ **UI Toggle**: Added - big switch on SMTP Settings page
- ✅ **Backend Logic**: Updated - checks UI toggle first
- ✅ **No Database Changes**: Uses existing fields only
- ✅ **Docker Compose**: EMAIL_ENABLED=true (allows UI control)

## To Start Using

1. **Disable emails now**: Run the SQL above
2. **Configure SMTP**: Add your email server settings in UI
3. **Test**: Use "Send Test Email" button
4. **Enable**: Toggle switch to ON when ready

## Visual Guide

```
┌─────────────────────────────────────────────────┐
│  📧 Email Notifications             [ON/OFF]   │
│  ✅ Emails ENABLED - System will send emails    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (Green background when ON)                     │
└─────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────┐
│  📧 Email Notifications             [OFF/ON]   │
│  🔴 Emails DISABLED - No emails will be sent    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  (Gray background when OFF)                     │
└─────────────────────────────────────────────────┘
```

## Need More Details?

See: `EMAIL_TOGGLE_GUIDE.md`


