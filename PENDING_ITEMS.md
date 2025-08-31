# 🚨 PENDING ITEMS - Viaticos 2025

Last Updated: August 30, 2025

## 🔵 **CURRENT MAJOR REFACTOR: CURRENCY MASTER IMPLEMENTATION**

### Currency Refactor Progress:
✅ **Backend Models**: Created Currency master table, updated Prepayment/Expense models  
✅ **Backend Schemas**: Updated all Pydantic schemas for currency_id foreign keys  
🔄 **Backend APIs**: Currently updating all routers for new currency logic  
✅ **Frontend Forms**: Updated for independent currency selection  
✅ **Dashboard Filters**: Implemented separate country and currency filters  
✅ **Travel Report Inheritance**: Enforced on backend

**Changes Made:**
- Removed `currency` field from Country model
- Added Currency master table with name, code, symbol
- Updated Prepayment model: `currency` → `currency_id` (FK)
- Updated Expense model: `currency` → `currency_id` (FK)
- Updated all backend schemas to reflect FK relationships

---

## ✅ **COMPLETED ITEMS**
1. ✅ **Dashboard Data** - Fixed to show real database totals instead of mock data
2. ✅ **User Creation 500 Error** - Fixed foreign key constraint error (supervisor_id) and force_password_change field
3. ✅ **User Force Password Change** - Fixed backend to respect frontend toggle value

---

## 🔴 **HIGH PRIORITY PENDING ITEMS**

### 1. ✅ **Countries Disappearing After Refresh** 
   - **Status**: ✅ FIXED
   - **Issue**: Countries disappeared after refresh because SettingsPage used mock data instead of API
   - **Root Cause**: Countries section was still using in-memory state with hardcoded mock data
   - **Solution**: Integrated SettingsPage countries section with real `countryService` API calls
   - **Changes**: Added `loadCountries()`, `handleSaveCountry()`, `handleDeleteCountry()` with real persistence

### 2. **Categories Alert Amount Per Country** 
   - **Status**: 📅 DEFERRED (Post-Currency Refactor)
   - **Issue**: Categories only have single alert_amount, need per-country amounts
   - **Progress**: Schema design exists, implementation deferred until currency refactor complete
   - **Requirements**: Each category should have different alert amounts for different countries
   - **Note**: Will be addressed after currency master implementation is complete

### 3. ✅ **Travel Expense Report Totals Fixed**
   - **Status**: ✅ FIXED
   - **Issues Fixed**: 
     - ReportViewModal was showing hardcoded mock expenses instead of real data
     - Number formatting issue: API returns amounts as strings, causing "02000.00" display
   - **Solutions**:
     - Integrated real expense loading from `/expenses/?report_id=X` API
     - Fixed string-to-number conversion for proper total calculation
     - Added proper number formatting with `.toLocaleString()`

### 4. **Expense Creation Errors**
   - **Status**: ✅ RESOLVED
   - **Issue**: User reported expense creation failures
   - **Root Cause**: Multiple issues including foreign key violations and React controlled component errors
   - **Solutions Applied**:
     - Fixed factura_supplier_id null handling for "Boleta" document types
     - Implemented country/currency inheritance from travel expense reports
     - Fixed React controlled component consistency for factura_supplier_id

---

## 🟡 **MEDIUM PRIORITY ITEMS**

### 5. **Email Notifications for Report Approval Workflow**
   - **Status**: 🟡 PENDING IMPLEMENTATION
   - **Issue**: Need to implement email service for travel expense report approval workflow
   - **Details**: Same as prepayments - notify users at each approval stage (supervisor, accounting, treasury)
   - **Impact**: User experience improvement for approval notifications

### 6. **Frontend Compilation Warnings**
   - **Status**: 🟡 NON-BLOCKING
   - **Issue**: Multiple ESLint warnings about unused variables and missing dependencies
   - **Impact**: Code quality, no functional impact

### 7. **Export/Download Functionality** 
   - **Status**: 🟡 PLACEHOLDER
   - **Issue**: Export buttons show placeholder alerts instead of real functionality
   - **Impact**: Feature incomplete but safe (no crashes)

---

## 🔴 **CURRENCY REFACTOR IMPLEMENTATION TASKS**

### Backend Tasks (🔄 IN PROGRESS):
- ✅ Create Currency model and table
- ✅ Update Prepayment/Expense models for currency_id FK
- ✅ Update all Pydantic schemas
- ✅ Create currencies router and endpoints
- 🔄 Update prepayments router for new currency logic
- ⏳ Update expenses router for new currency logic
- ⏳ Update dashboard router for currency/country filters
- ⏳ Database migration and initial currency data

### Frontend Tasks (⏳ PENDING):
- ⏳ Update PrepaymentModal for currency selection
- ⏳ Update ExpenseModal for inherited currency logic
- ⏳ Update Dashboard with separate currency/country filters
- ⏳ Update all forms to use currency master data
- ⏳ Test complete frontend integration

### Testing Tasks (⏳ PENDING):
- ⏳ Test backend APIs with new currency requirements
- ⏳ Test frontend forms and data flow
- ⏳ Validate currency inheritance in travel expense reports
- ⏳ Test dashboard filters functionality

---

## 🔵 **MOCK DATA STILL IN FRONTEND**

### 7. **Dashboard Charts Mock Data**
   - **Status**: 🔴 HARDCODED MOCK DATA
   - **File**: `frontend/src/pages/Dashboard.tsx` (lines 50-64)
   - **Issue**: Monthly and category chart data is hardcoded
   - **Mock Data**: 
     - `monthlyData`: Jan-Jun amounts (4000, 3000, 5000, etc.)
     - `categoryData`: Transport, Accommodation, Meals, Others with fake amounts
   - **Solution Needed**: Create backend endpoints for chart data

### 8. **File Download Placeholders**
   - **Status**: 🟡 PLACEHOLDER FUNCTIONALITY
   - **Files**: Multiple modals and forms
   - **Issues**:
     - `PrepaymentModal.tsx` (line 159): File download shows alert
     - `ExpenseModal.tsx` (line 251): File download shows alert  
     - `ExpenseViewModal.tsx` (line 53): File download shows alert
     - `PrepaymentViewModal.tsx`: File download placeholder
   - **Solution Needed**: Implement real file upload/download with backend storage

### 9. **Reports Export/Download Placeholders**
   - **Status**: 🟡 PLACEHOLDER FUNCTIONALITY  
   - **File**: `frontend/src/pages/ReportsPage.tsx` (lines 171-203)
   - **Issues**:
     - `handleExportAll()`: Shows info snackbar, fake download
     - `handleGenerateReport()`: Shows info snackbar, fake PDF generation
   - **Solution Needed**: Implement real export/PDF generation backend APIs

### 10. **Report View Modal Fixed (✅ Done)**
   - **Status**: ✅ FIXED
   - **File**: `frontend/src/components/modals/ReportViewModal.tsx`
   - **Issue**: Was showing hardcoded mock expenses instead of real data
   - **Solution**: Now loads real expenses from `/expenses/?report_id=X` API

## 🔵 **INVESTIGATION NEEDED**

### 11. **Full Frontend-Backend Integration Audit**
   - **Status**: 🔍 PENDING
   - **Issue**: Systematic check of remaining mock/placeholder functionality
   - **Next Steps**: Implement missing backend endpoints for charts and file handling

### 8. **Database Schema Migration** 
   - **Status**: 🔍 PENDING
   - **Issue**: Ensure all schema changes are properly migrated
   - **Current**: New CategoryCountryAlert table needs migration

---

## 📋 **WORKING NOTES**

### Current Focus: 
**Approval Hierarchy for Prepayments** - Implement multi-stage transitions using the status field

---

## 🆕 Approval Hierarchy Tasks

### Backend (IN PROGRESS)
- Extend `RequestStatus`/status values: SUPERVISOR_PENDING, ACCOUNTING_PENDING, TREASURY_PENDING
- Add `POST /api/approvals/prepayments/{id}/submit` with validations
- Update `POST /api/approvals/prepayments/{id}/approve` transitions and error paths
- Filter `/api/approvals/pending` by user role and current stage
- Auto-create Travel Expense Report on APPROVED if not existing

### Frontend (PENDING)
- Add “Send for approval” action to `PrepaymentsPage`
- Map backend statuses to user-facing labels (multi-language)
- Show stage chips in prepayments list (optional)

### Test Commands:
```bash
# Test countries API
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"admin123"}' | jq -r '.access_token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/countries/

# Test user creation
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"test@example.com","name":"Test","surname":"User","password":"admin123","sap_code":"SAP001","country_id":1,"cost_center":"CC1001","supervisor_id":null,"profile":"employee","is_superuser":false,"is_approver":false,"force_password_change":false}' http://localhost:8000/api/users/
```

### Key Files Modified (Currency Refactor):
- `backend/app/models/models.py` - Added Currency model, updated Prepayment/Expense
- `backend/app/schemas/currency_schemas.py` - New currency schemas
- `backend/app/schemas/prepayment_schemas.py` - Updated for currency_id FK
- `backend/app/schemas/expense_schemas.py` - Updated for currency_id FK
- `backend/app/routers/currencies.py` - New currency CRUD endpoints
- `backend/app/routers/prepayments.py` - Updated for currency logic
- `backend/app/routers/expenses.py` - Updated for currency inheritance

### Previous Fixes:
- `backend/app/routers/users.py` - Fixed force_password_change
- `frontend/src/services/userService.ts` - Fixed supervisor_id types
- `frontend/src/components/forms/UserModal.tsx` - Fixed supervisor_id handling

---

*This document will be updated as we complete each item.*
ityou