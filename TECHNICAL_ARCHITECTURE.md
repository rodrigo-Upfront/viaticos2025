# Viaticos 2025 - Technical Architecture Specification

## 1. System Architecture Overview

### 1.1 Architecture Pattern
- **Pattern:** Multi-tier containerized architecture
- **Deployment:** Docker containers on Windows Server 2022
- **Communication:** RESTful APIs between frontend and backend

### 1.2 Technology Stack Details

#### Frontend Stack
- **Framework:** React 18+ with TypeScript
- **Runtime:** Node.js 18+ LTS
- **State Management:** Redux Toolkit or Zustand
- **UI Library:** Material-UI or Ant Design
- **HTTP Client:** Axios
- **Build Tool:** Vite or Create React App
- **Internationalization:** react-i18next

#### Backend Stack
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy with Alembic for migrations
- **Authentication:** JWT with bcrypt for password hashing
- **File Handling:** Python's built-in file operations
- **Email:** smtplib with email templates
- **Export Libraries:** 
  - pandas for CSV/Excel generation
  - reportlab for PDF generation
- **Testing:** pytest, pytest-asyncio

#### Database Stack
- **Production:** SQL Server 2022
- **Testing:** PostgreSQL 15+
- **Connection Pooling:** SQLAlchemy connection pools
- **Migrations:** Alembic

## 2. Container Architecture

### 2.1 Frontend Container
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 2.2 Backend Container
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 Database Container
- **Production:** SQL Server 2022 container
- **Testing:** PostgreSQL 15 container
- **Persistent Storage:** Docker volumes for data persistence

## 3. API Design

### 3.1 RESTful Endpoints Structure

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Password change
- `GET /api/auth/me` - Current user info

#### Users
- `GET /api/users` - List users (superuser only)
- `POST /api/users` - Create user (superuser only)
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user (superuser only)

#### Prepayments
- `GET /api/prepayments` - List user's prepayments
- `POST /api/prepayments` - Create prepayment
- `GET /api/prepayments/{id}` - Get prepayment details
- `PUT /api/prepayments/{id}` - Update prepayment
- `POST /api/prepayments/{id}/submit` - Submit for approval

#### Travel Expense Reports
- `GET /api/expense-reports` - List expense reports
- `GET /api/expense-reports/{id}` - Get report details
- `POST /api/expense-reports/{id}/submit` - Submit for approval
- `GET /api/expense-reports/{id}/export` - Export to CSV

#### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/{id}` - Get expense details
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

#### Approvals
- `GET /api/approvals/pending` - Pending approvals for user
- `POST /api/approvals/{id}/approve` - Approve request
- `POST /api/approvals/{id}/reject` - Reject request

#### Master Data
- `GET /api/countries` - List countries
- `GET /api/categories` - List expense categories
- `GET /api/suppliers` - List factura suppliers

#### Reports & Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/reports/expenses/monthly` - Monthly expense data
- `GET /api/reports/expenses/category` - Category expense data
- `POST /api/exports/bulk` - Bulk export generation

### 3.2 Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "errors": []
}
```

### 3.3 Error Handling
- **400 Bad Request:** Validation errors
- **401 Unauthorized:** Authentication required
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **422 Unprocessable Entity:** Business logic errors
- **500 Internal Server Error:** System errors

## 4. Database Design

### 4.1 Connection Configuration
```python
# Production SQL Server
DATABASE_URL = "mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+17+for+SQL+Server"

# Testing PostgreSQL
TEST_DATABASE_URL = "postgresql://username:password@localhost/test_database"
```

### 4.2 Migration Strategy
- **Tool:** Alembic for database migrations
- **Versioning:** Sequential migration files
- **Rollback:** Support for migration rollbacks
- **Environment Separation:** Different migration environments for dev/test/prod

### 4.3 Indexes and Performance
```sql
-- Key indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_prepayment_user ON prepayments(requesting_user_id);
CREATE INDEX idx_prepayment_status ON prepayments(status);
CREATE INDEX idx_expense_report ON expenses(travel_expense_report_id);
CREATE INDEX idx_approval_entity ON approvals(entity_type, entity_id);
CREATE INDEX idx_approval_user ON approvals(approver_user_id);
```

## 5. Security Implementation

### 5.1 Authentication
- **JWT Tokens:** Access tokens with 15-minute expiry
- **Refresh Tokens:** 7-day expiry for token renewal
- **Password Policy:** Minimum 8 characters, mixed case, numbers
- **Session Management:** Stateless JWT-based sessions

### 5.2 Authorization
- **Role-Based Access Control (RBAC):** Profile-based permissions
- **Field-Level Security:** Sensitive fields protected
- **API Endpoint Protection:** Decorator-based authorization

### 5.3 File Upload Security
```python
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
```

### 5.4 Data Validation
- **Input Sanitization:** SQL injection prevention
- **XSS Protection:** Output encoding
- **CSRF Protection:** Token-based protection

## 6. File Management

### 6.1 Storage Structure
```
/app/storage/
├── uploads/
│   ├── prepayments/
│   │   └── {prepayment_id}/
│   │       └── {filename}
│   └── expenses/
│       └── {expense_id}/
│           └── {filename}
└── exports/
    ├── csv/
    ├── excel/
    └── pdf/
```

### 6.2 File Processing
- **Upload Validation:** File type, size, virus scanning
- **Naming Convention:** UUID-based filenames to prevent conflicts
- **Cleanup:** Automated cleanup of temporary export files

## 7. Email System

### 7.1 Email Templates
- **Approval Request:** Notification to approvers
- **Rejection Notice:** Notification to requesters
- **Approval Completion:** Final approval notification

### 7.2 Email Configuration
```python
SMTP_SERVER = "smtp.company.com"
SMTP_PORT = 587
SMTP_USERNAME = "viaticos@company.com"
SMTP_PASSWORD = "secure_password"
SMTP_USE_TLS = True
```

### 7.3 Email Queue
- **Async Processing:** Background task queue for email sending
- **Retry Logic:** Failed email retry mechanism
- **Rate Limiting:** Prevent email flooding

## 8. Monitoring and Logging

### 8.1 Application Logging
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/application.log'),
        logging.StreamHandler()
    ]
)
```

### 8.2 Metrics and Monitoring
- **Application Metrics:** Response times, error rates
- **Database Metrics:** Query performance, connection counts
- **System Metrics:** CPU, memory, disk usage

### 8.3 Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": await check_database_connection(),
        "storage": check_storage_availability()
    }
```

## 9. Internationalization (i18n)

### 9.1 Frontend Implementation
```javascript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      es: { translation: require('./locales/es.json') }
    },
    lng: 'es', // default language
    fallbackLng: 'en'
  });
```

### 9.2 Backend Implementation
```python
# Date formatting based on locale
def format_date(date, locale='es'):
    if locale == 'es':
        return date.strftime('%d/%m/%Y')
    else:  # English
        return date.strftime('%m/%d/%Y')
```

## 10. Performance Optimization

### 10.1 Frontend Optimization
- **Code Splitting:** Route-based code splitting
- **Lazy Loading:** Component lazy loading
- **Caching:** Browser caching for static assets
- **Bundle Optimization:** Tree shaking and minification

### 10.2 Backend Optimization
- **Database Connection Pooling:** Efficient connection management
- **Query Optimization:** Indexed queries and query analysis
- **Caching:** Redis for session and data caching
- **Async Processing:** Background tasks for heavy operations

### 10.3 Database Optimization
- **Indexing Strategy:** Strategic index placement
- **Query Analysis:** Regular query performance review
- **Partitioning:** Table partitioning for large datasets

## 11. Testing Strategy

### 11.1 Frontend Testing
- **Unit Tests:** Jest + React Testing Library
- **Integration Tests:** Component integration testing
- **E2E Tests:** Cypress for end-to-end testing

### 11.2 Backend Testing
```python
# pytest configuration
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    return TestClient(app)

def test_create_prepayment(client):
    response = client.post("/api/prepayments", json={...})
    assert response.status_code == 201
```

### 11.3 Database Testing
- **Test Database:** Separate PostgreSQL database for testing
- **Test Data:** Factory-based test data generation
- **Migration Testing:** Automated migration testing

## 12. Deployment Configuration

### 12.1 Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://backend:8000
    
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SMTP_SERVER=${SMTP_SERVER}
    volumes:
      - ./storage:/app/storage
    
  database:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - SA_PASSWORD=${DB_PASSWORD}
      - ACCEPT_EULA=Y
    volumes:
      - db_data:/var/opt/mssql

volumes:
  db_data:
```

### 12.2 Environment Variables
```bash
# Production environment
DATABASE_URL=mssql+pyodbc://...
SMTP_SERVER=smtp.company.com
SMTP_USERNAME=viaticos@company.com
SMTP_PASSWORD=secure_password
JWT_SECRET_KEY=super_secret_key
UPLOAD_PATH=/app/storage/uploads
```

## 13. Backup and Recovery

### 13.1 Database Backup
- **Automated Backups:** Daily database backups
- **Retention Policy:** 30-day backup retention
- **Recovery Testing:** Monthly recovery testing

### 13.2 File Backup
- **Storage Backup:** Regular backup of uploaded files
- **Versioning:** File version control for important documents

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Review Schedule:** Monthly during development

