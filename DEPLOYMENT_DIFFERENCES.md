# Local vs Deployed Environment Differences

This document outlines the key differences between local development and production deployment environments to prevent deployment issues.

## Database Configuration

### Local Environment
- **Database Name**: `viaticos` (default in config.py)
- **Host**: `localhost:5432`
- **Connection**: Direct PostgreSQL connection
- **Users**: Development test users with simple passwords

### Deployed Environment
- **Database Name**: `viaticos` (configured in docker-compose.yml)
- **Host**: `database:5432` (Docker internal network)
- **Connection**: Through Docker Compose service
- **Multiple Databases**: May have both `viaticos` and `viaticos_db` from migration history
- **Users**: Production users with specific credentials

**⚠️ Critical Issue**: During deployment, verify:
1. Backend connects to correct database (`viaticos`)
2. Users exist in the correct database
3. Password hashes are properly set for production users

## API Configuration

### Local Environment
```bash
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

### Deployed Environment
```bash
REACT_APP_API_BASE_URL=http://161.35.39.205/api
```

**⚠️ Critical Issue**: Frontend must be built with production API URL.
- **Wrong**: `http://161.35.39.205:8000/api` (bypasses Nginx)
- **Correct**: `http://161.35.39.205/api` (through Nginx proxy on port 80)

## Container Architecture

### Local Environment
- Direct port access to services
- Backend: `localhost:8000`
- Database: `localhost:5432`
- Frontend: `localhost:3000`

### Deployed Environment
- All traffic routed through Nginx reverse proxy
- External access only through port 80
- Internal Docker network communication
- Services not directly accessible from outside

## User Credentials

### Local Environment
- Standard test users with `password123`
- Consistent across all test accounts

### Deployed Environment
- Specific user credentials:
  - `empleado01@amcor.com` / `admin123`
  - Other users may have different passwords
- **⚠️ Important**: Always verify/reset passwords after deployment

## Error Handling

### Issue Discovered
- Generic exception handling was catching HTTPExceptions
- Resulted in empty error messages: `"Login failed: "`

### Solution Applied
```python
except HTTPException:
    # Re-raise HTTPExceptions (like invalid credentials) without modification
    raise
except Exception as e:
    # Handle other exceptions
    raise HTTPException(...)
```

## Frontend Build Process

### Local Development
- Development build with hot reload
- Environment variables loaded from `.env`

### Production Deployment
- Static build with environment variables baked in
- Must rebuild frontend container when API URL changes
- Build args passed through Docker Compose

## Docker Compose Differences

### Local (`docker-compose.yml`)
```yaml
environment:
  REACT_APP_API_BASE_URL: http://localhost:8000/api
```

### Production (`docker-compose.prod.yml`)
```yaml
build:
  args:
    REACT_APP_API_BASE_URL: http://161.35.39.205/api
environment:
  REACT_APP_API_BASE_URL: http://161.35.39.205/api
```

## Common Deployment Issues & Solutions

### 1. Empty Login Error Messages
**Symptom**: Login fails with empty error message
**Cause**: HTTPException caught by generic exception handler
**Solution**: Allow HTTPException to pass through

### 2. Frontend API Connection Failure
**Symptom**: Network errors, CORS issues
**Cause**: Wrong API URL in frontend build
**Solution**: Verify `REACT_APP_API_BASE_URL` and rebuild frontend

### 3. Database User Not Found
**Symptom**: Authentication works in tests but fails in browser
**Cause**: Multiple databases or wrong database connection
**Solution**: Verify backend connects to correct database with proper users

### 4. Password Authentication Failure
**Symptom**: "Invalid email or password" with correct credentials
**Cause**: Password hash mismatch or wrong password
**Solution**: Reset password using backend auth service

## Deployment Checklist

### Pre-Deployment
- [ ] Verify all environment variables in `docker-compose.prod.yml`
- [ ] Ensure frontend `REACT_APP_API_BASE_URL` points to production
- [ ] Check database connection strings
- [ ] Verify user credentials

### During Deployment
- [ ] Pull latest code: `git pull origin main`
- [ ] Build services: `docker-compose build`
- [ ] Deploy: `docker-compose up -d`
- [ ] Check service status: `docker-compose ps`

### Post-Deployment Verification
- [ ] Test API health: `curl http://161.35.39.205/api/health`
- [ ] Verify database connection and user existence
- [ ] Test login with known credentials
- [ ] Check frontend build has correct API URL
- [ ] Verify error messages display properly

### Database Verification Commands
```bash
# Check backend database connection
docker exec viaticos2025_backend_1 python -c "
from app.database.connection import get_db
from sqlalchemy import text
db = next(get_db())
result = db.execute(text('SELECT current_database()'))
print('Connected to:', result.fetchone()[0])
"

# List all databases
docker exec viaticos2025_database_1 psql -U postgres -l

# Check users in correct database
docker exec viaticos2025_database_1 psql -U postgres -d viaticos -c "SELECT email, profile FROM users;"

# Reset user password if needed
docker exec viaticos2025_backend_1 python -c "
from app.services.auth_service import AuthService
from app.database.connection import get_db
from app.models.models import User
auth_service = AuthService()
new_hash = auth_service.get_password_hash('admin123')
db = next(get_db())
user = db.query(User).filter(User.email == 'empleado01@amcor.com').first()
user.password = new_hash
db.commit()
print('Password updated')
"
```

### Frontend Verification Commands
```bash
# Check API URL in frontend build
docker exec viaticos2025_frontend_1 find /app/build/static/js -name '*.js' -exec grep -o 'http://[^"]*api' {} \; | head -1

# Force frontend rebuild if needed
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

## Environment Variables Reference

### Required Production Variables
```env
# Backend
DATABASE_URL=postgresql://postgres:postgres123@database:5432/viaticos
SECRET_KEY=your-super-secret-key-change-in-production-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend
REACT_APP_API_BASE_URL=http://161.35.39.205/api
```

## Network Architecture

### Local
```
Browser → localhost:3000 (Frontend)
        → localhost:8000/api (Backend)
        → localhost:5432 (Database)
```

### Production
```
Browser → 161.35.39.205:80 (Nginx)
        → Frontend Container (Static files)
        → Backend Container (/api routes)
        → Database Container (Internal network)
```

## Key Learnings

1. **Always verify database connections** before assuming code issues
2. **Frontend builds must use production API URLs** - cannot be changed at runtime
3. **Exception handling order matters** - specific exceptions before generic ones
4. **User credentials may differ** between environments
5. **Container networking** requires different connection strings than local development

This document should be updated whenever new environment differences are discovered during deployments.
