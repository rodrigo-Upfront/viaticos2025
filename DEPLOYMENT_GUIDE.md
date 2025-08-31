# Production Deployment Guide

## Lessons Learned from Latest Deployment

This guide documents the key lessons learned and best practices for smooth production deployments of the Viaticos 2025 system.

## 🚨 Critical Issues Encountered & Solutions

### 1. **Database Schema Synchronization**
**Problem:** Production database was missing columns and enum values that existed in development.

**Root Cause:** 
- Manual database migrations weren't properly tracked
- Schema changes made during development weren't systematically applied to production

**Solution:**
```sql
-- Missing columns that had to be added manually:
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) DEFAULT 'prepayment';
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS reason VARCHAR(500);
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES currencies(id);
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE travel_expense_reports ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE travel_expense_reports ALTER COLUMN prepayment_id DROP NOT NULL;

ALTER TABLE prepayments ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300);

-- Missing enum values:
ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'APPROVED_FOR_REIMBURSEMENT';
ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'FUNDS_RETURN_PENDING';
```

### 2. **Authentication Hash Compatibility**
**Problem:** Password hashes from development weren't compatible with production's passlib system.

**Root Cause:** 
- Different password hashing methods between environments
- Exported data contained incompatible hash formats

**Solution:** Regenerate all password hashes using the production environment's AuthService.

### 3. **Code Deployment Lag**
**Problem:** Latest features (currency management) weren't deployed initially.

**Root Cause:** 
- Changes weren't committed and pushed before deployment
- No verification that latest code was actually deployed

## 📋 **DEPLOYMENT CHECKLIST**

### Pre-Deployment Phase

#### 1. **Code Preparation**
- [ ] All changes committed locally
- [ ] All tests passing (`npm run validate` in frontend)
- [ ] No linter errors
- [ ] All TODOs completed or documented
- [ ] Git status clean (`git status`)

#### 2. **Database Migration Planning**
- [ ] Document all schema changes made during development
- [ ] Create migration scripts for new columns, tables, constraints
- [ ] Create enum value addition scripts
- [ ] Test migration scripts on local copy of production data
- [ ] Prepare rollback scripts

#### 3. **Data Export/Import Strategy**
- [ ] Export master data in correct dependency order:
  1. Currencies (no dependencies)
  2. Countries (may depend on currencies)
  3. Categories (independent)
  4. Suppliers (independent)  
  5. Users (depends on countries, self-references)
- [ ] Use JSON format for cross-platform compatibility
- [ ] Test import process locally first

### Deployment Phase

#### 4. **Code Deployment**
```bash
# 1. Commit and push latest changes
git add .
git commit -m "feat: deployment-ready changes"
git push origin main

# 2. Pull on production server
ssh root@server "cd /var/www/viaticos2025 && git pull origin main"

# 3. Rebuild containers
ssh root@server "cd /var/www/viaticos2025 && docker-compose down && docker-compose build && docker-compose up -d"
```

#### 5. **Database Schema Updates**
```bash
# Apply schema changes in correct order:
# 1. Add columns
# 2. Modify constraints  
# 3. Add enum values (separate transactions)
# 4. Update data if needed

# Example:
ssh root@server "cd /var/www/viaticos2025 && docker-compose exec -T database psql -U postgres -d viaticos_db -f migration.sql"
```

#### 6. **Data Import**
```bash
# 1. Export from local
docker exec viaticos_backend python3 export_data.py

# 2. Upload to production
scp -r data_exports/ root@server:/var/www/viaticos2025/

# 3. Import on production
ssh root@server "cd /var/www/viaticos2025 && docker-compose exec -T backend python3 import_data.py"
```

### Post-Deployment Phase

#### 7. **Verification & Testing**
- [ ] **Authentication Test**
  ```bash
  curl -X POST http://server:8000/api/auth/login -H 'Content-Type: application/json' -d '{"email": "test@test.com", "password": "admin123"}'
  ```

- [ ] **API Endpoints Test**
  ```bash
  # Test key endpoints
  curl -H "Authorization: Bearer $TOKEN" http://server:8000/api/expense-reports/
  curl -H "Authorization: Bearer $TOKEN" http://server:8000/api/approvals/pending
  curl -H "Authorization: Bearer $TOKEN" http://server:8000/api/currencies/
  ```

- [ ] **Frontend Access Test**
  ```bash
  curl -I http://server:3000
  ```

- [ ] **Feature Verification**
  - [ ] Login with all test users
  - [ ] Currency management tab visible in Settings
  - [ ] Approval workflow accessible
  - [ ] All major features functional

#### 8. **Infrastructure Checks**
- [ ] Firewall ports open (3000, 8000)
- [ ] SSL certificates valid (if applicable)
- [ ] Database connections stable
- [ ] Container logs clean of errors

## 🛠 **TOOLS & SCRIPTS TO CREATE**

### 1. **Automated Schema Comparison**
Create a script that compares local vs production database schemas:
```python
# schema_diff.py - Compare schemas between environments
def compare_schemas(local_db, prod_db):
    # Compare tables, columns, constraints, enums
    # Generate migration scripts automatically
```

### 2. **Deployment Automation Script**
```bash
#!/bin/bash
# deploy.sh - Automated deployment script
set -e

echo "🚀 Starting deployment..."

# 1. Pre-flight checks
echo "📋 Running pre-flight checks..."
npm run validate
git status --porcelain | grep -q . && echo "❌ Uncommitted changes" && exit 1

# 2. Deploy code
echo "📦 Deploying code..."
git push origin main
ssh root@$SERVER "cd $APP_DIR && git pull origin main"

# 3. Update infrastructure
echo "🏗️ Updating containers..."
ssh root@$SERVER "cd $APP_DIR && docker-compose down && docker-compose build && docker-compose up -d"

# 4. Run migrations
echo "🗄️ Running migrations..."
ssh root@$SERVER "cd $APP_DIR && ./run_migrations.sh"

# 5. Verify deployment
echo "✅ Verifying deployment..."
./verify_deployment.sh

echo "🎉 Deployment complete!"
```

### 3. **Environment Sync Tool**
```python
# sync_env.py - Sync development changes to production
def sync_environment():
    # 1. Export schema differences
    # 2. Export data changes
    # 3. Generate migration scripts
    # 4. Apply to production safely
```

## 📚 **BEST PRACTICES LEARNED**

### 1. **Database Management**
- **Always use transactions** for schema changes
- **Add enum values in separate transactions** (PostgreSQL requirement)
- **Make columns nullable first**, then add constraints
- **Test migrations on production-like data** before deployment

### 2. **Password Management**
- **Use consistent password hashing** across environments
- **Document password changes** clearly
- **Test authentication immediately** after password updates
- **Use environment-specific password generation** tools

### 3. **Code Deployment**
- **Verify latest code is committed** before deployment
- **Use git tags** for production releases
- **Rebuild containers completely** to avoid caching issues
- **Check container logs** immediately after deployment

### 4. **Communication**
- **Document all changes made** during deployment
- **Announce password changes** immediately
- **Provide clear test credentials** after deployment
- **Create deployment summary** with what was changed

## 🔄 **ROLLBACK PROCEDURES**

### Quick Rollback Checklist
1. **Code Rollback**
   ```bash
   git revert <commit-hash>
   git push origin main
   ssh root@server "cd /var/www/viaticos2025 && git pull origin main && docker-compose restart"
   ```

2. **Database Rollback**
   ```sql
   -- Have rollback scripts ready for each migration
   -- Example:
   ALTER TABLE travel_expense_reports DROP COLUMN IF EXISTS report_type;
   ```

3. **Container Rollback**
   ```bash
   # Use previous working image
   docker-compose down
   docker-compose up -d --force-recreate
   ```

## 📊 **MONITORING & ALERTS**

### Health Check Endpoints
- `GET /health` - Backend health
- `GET /api/auth/me` - Authentication check
- `GET /` - Frontend availability

### Key Metrics to Monitor
- Response times for critical endpoints
- Authentication success rates
- Database connection pool status
- Container resource usage

## 🎯 **NEXT DEPLOYMENT IMPROVEMENTS**

1. **Create automated migration system**
2. **Implement blue-green deployment**
3. **Add comprehensive health checks**
4. **Set up monitoring and alerting**
5. **Create staging environment** that mirrors production
6. **Implement database backup automation**
7. **Add performance testing** to deployment pipeline

---

## 📞 **EMERGENCY CONTACTS & PROCEDURES**

- **Database Issues**: Check container logs, restart database container
- **Authentication Issues**: Verify password hashes, check JWT configuration
- **Frontend Issues**: Clear browser cache, check container build logs
- **API Issues**: Check backend logs, verify database connectivity

Remember: **Always test in staging first!** 🚀
