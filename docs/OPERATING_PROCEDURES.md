# Operating Procedures for Viaticos 2025 Development

## CRITICAL SAFETY PROTOCOLS

### ⚠️ Database and Data Protection Protocol

**NEVER execute destructive commands without explicit user confirmation.**

#### Commands requiring DOUBLE CONFIRMATION:
- `docker-compose down -v` (deletes all volumes including database)
- `docker volume rm` (removes specific volumes)
- `DROP DATABASE` or similar SQL commands
- Any cleanup scripts that delete data
- Commands that truncate or delete database tables
- File deletion commands affecting user data or configurations

#### Required Process:
1. **STOP** - Identify if the command could cause data loss
2. **EXPLAIN** - Clearly describe what data will be lost
3. **PROPOSE ALTERNATIVES** - Suggest non-destructive solutions first
4. **ASK PERMISSION** - Get explicit double confirmation before proceeding
5. **DOCUMENT** - Log what was deleted and why

#### Example Safe Process:
```
❌ WRONG: "Let me restart with fresh database" → `docker-compose down -v`

✅ CORRECT: 
"I need to fix the PostgreSQL version issue. This requires either:
1. NON-DESTRUCTIVE: Dump current data, fix schema, restore
2. DESTRUCTIVE: Delete volume and lose all your development data

The destructive option would delete:
- All user accounts from weeks of development  
- All expenses, prepayments, business data
- All settings and configurations

Would you like me to proceed with option 1 (safe) or do you explicitly 
want me to delete everything and start fresh? Please confirm twice if 
you want data deletion."
```

### 🔒 Data Backup Requirements

Before any potentially destructive operation:
1. **Always create a backup first** when possible
2. **Verify backup integrity** before proceeding
3. **Document backup location** for recovery

### 📝 Additional Safety Rules

- **Ask before deleting files** that aren't clearly temporary
- **Confirm before overwriting** configuration files
- **Double-check commands** that modify production-like environments
- **Preserve user work** - development time is valuable and irreplaceable

---

**Remember: It's better to ask permission twice than to apologize for data loss.**

This protocol was established after an incident where database volumes were accidentally deleted during troubleshooting, causing loss of weeks of development work.
