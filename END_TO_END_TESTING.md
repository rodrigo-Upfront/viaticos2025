# 🧪 END-TO-END TESTING GUIDE
**Viaticos 2025 - Complete Workflow Verification**

## 🎯 **TESTING OBJECTIVES**
Verify that all modules work together seamlessly with real database persistence and cross-module integration.

## 🚀 **PREREQUISITES**
- ✅ All services running: `docker compose ps`
- ✅ Frontend: http://localhost:3000
- ✅ Backend API: http://localhost:8000
- ✅ Database: PostgreSQL on port 5432

---

## 📋 **PHASE 1: AUTHENTICATION & BASIC SETUP**

### Step 1.1: Login
- [ ] Navigate to http://localhost:3000
- [ ] Login with: `test@test.com` / `admin123`
- [ ] Verify successful redirect to dashboard
- [ ] Confirm user profile shows "Super Admin"

### Step 1.2: Dashboard Data
- [ ] Verify dashboard shows real data (not mock numbers)
- [ ] Check that charts and statistics load properly
- [ ] Note: Numbers may be zero initially (this is expected)

---

## 📋 **PHASE 2: MASTER DATA SETUP**

### Step 2.1: Countries Management
- [ ] Navigate to Settings → Countries tab
- [ ] Verify existing countries: Peru, Chile
- [ ] **CREATE TEST**: Add "Colombia" with currency "COP"
- [ ] **EDIT TEST**: Modify Chile currency to "CLP2" 
- [ ] **DELETE TEST**: Remove the test country
- [ ] **PERSISTENCE**: Refresh page, verify data persists

### Step 2.2: Categories Management  
- [ ] Navigate to Settings → Categories tab
- [ ] Verify existing: "Food" category
- [ ] **CREATE TEST**: Add "Transportation" (Account: 10002, Alert: $500)
- [ ] **CREATE TEST**: Add "Accommodation" (Account: 10003, Alert: $1000)
- [ ] **EDIT TEST**: Modify Food alert amount
- [ ] **PERSISTENCE**: Refresh page, verify all categories persist

### Step 2.3: Suppliers Management
- [ ] Navigate to Settings → Suppliers tab
- [ ] Verify any existing suppliers
- [ ] **CREATE TEST**: Add "Restaurant Lima" (SAP: REST001)
- [ ] **CREATE TEST**: Add "Hotel Santiago" (SAP: HOT001)
- [ ] **CREATE TEST**: Add "Airline LATAM" (SAP: AIR001)
- [ ] **PERSISTENCE**: Refresh page, verify all suppliers persist

---

## 📋 **PHASE 3: USER MANAGEMENT**

### Step 3.1: User Creation
- [ ] Navigate to Users page
- [ ] Verify superuser exists: test@test.com
- [ ] **CREATE TEST**: Add Employee User:
  - Email: `john.doe@company.com`
  - Name: John Doe
  - SAP Code: EMP001
  - Country: Peru
  - Cost Center: IT
  - Profile: employee
  - Supervisor: Super Admin
- [ ] **CREATE TEST**: Add Manager/Approver:
  - Email: `manager@company.com`
  - Name: Jane Manager  
  - SAP Code: MGR001
  - Country: Chile
  - Profile: manager
  - ✅ Is Approver: TRUE
- [ ] **VERIFICATION**: Confirm both users appear in table
- [ ] **PERSISTENCE**: Refresh page, verify users persist

---

## 📋 **PHASE 4: PREPAYMENT WORKFLOW**

### Step 4.1: Create Prepayment (as Employee)
- [ ] **LOGIN SWITCH**: Logout and login as `john.doe@company.com` (password from creation)
- [ ] Navigate to Prepayments page
- [ ] **CREATE TEST**: Add new prepayment:
  - Reason: "Business trip to Santiago"
  - Destination: Chile
  - Start Date: Next Monday
  - End Date: Next Friday  
  - Amount: $1500
  - Currency: USD
  - Comment: "Client meeting and project review"
- [ ] **VERIFICATION**: Confirm prepayment appears with status "pending"
- [ ] **CROSS-MODULE**: Check if it appears in Approvals (should show for approvers)

### Step 4.2: Approval Workflow
- [ ] **LOGIN SWITCH**: Logout and login as `manager@company.com` 
- [ ] Navigate to Approvals page
- [ ] **VERIFICATION**: Confirm the prepayment appears in pending list
- [ ] **APPROVE TEST**: Click approve on the prepayment
- [ ] **CONFIRMATION**: Verify success message
- [ ] **STATUS CHECK**: Verify item disappears from pending list

### Step 4.3: Verify Status Change
- [ ] **LOGIN SWITCH**: Login back as `john.doe@company.com`
- [ ] Navigate to Prepayments page  
- [ ] **VERIFICATION**: Confirm prepayment status changed to "approved"
- [ ] **PERSISTENCE**: Refresh page, status should persist

---

## 📋 **PHASE 5: EXPENSE MANAGEMENT**

### Step 5.1: Create Expense Report
- [ ] Navigate to Reports page (as john.doe)
- [ ] **CHECK**: Should be empty initially
- [ ] **AUTOMATIC**: An approved prepayment should trigger report creation
- [ ] OR manually trigger report creation if needed

### Step 5.2: Add Expenses
- [ ] Navigate to Expenses page
- [ ] **CREATE TEST**: Add Meal Expense:
  - Category: Food  
  - Purpose: "Team lunch"
  - Document Type: Boleta
  - Boleta Supplier: "Restaurant Lima"
  - Date: Within travel dates
  - Country: Chile
  - Amount: $50
  - Currency: USD
  - Document Number: "B001-123"
- [ ] **CREATE TEST**: Add Transport Expense:
  - Category: Transportation
  - Purpose: "Airport taxi"
  - Document Type: Factura
  - Factura Supplier: Select from dropdown
  - Amount: $25
- [ ] **VERIFICATION**: Both expenses appear in table
- [ ] **CATEGORIES**: Verify categories loaded from Settings
- [ ] **SUPPLIERS**: Verify suppliers loaded from Settings

### Step 5.3: Expense Report Generation
- [ ] Navigate to Reports page
- [ ] **VERIFICATION**: Report should show:
  - Prepayment amount: $1500
  - Total expenses: $75 (50+25)
  - Balance: $1425 (under budget)
  - Status: pending
- [ ] **SEND FOR APPROVAL**: Click send for approval
- [ ] **STATUS**: Verify report status changes

---

## 📋 **PHASE 6: FINAL APPROVAL WORKFLOW**

### Step 6.1: Report Approval
- [ ] **LOGIN SWITCH**: Login as `manager@company.com`
- [ ] Navigate to Approvals page
- [ ] **VERIFICATION**: Expense report appears in pending
- [ ] **VIEW TEST**: Click view button, verify report details
- [ ] **APPROVE**: Approve the expense report
- [ ] **VERIFICATION**: Report disappears from pending

### Step 6.2: Final Status Verification
- [ ] **LOGIN SWITCH**: Login as `john.doe@company.com`
- [ ] Navigate to Reports page
- [ ] **VERIFICATION**: Report status = "approved"
- [ ] Navigate to Expenses page
- [ ] **VERIFICATION**: All expenses still visible and linked

---

## 📋 **PHASE 7: DATA PERSISTENCE & INTEGRATION**

### Step 7.1: Cross-Module Data Verification
- [ ] **SETTINGS**: Verify categories/suppliers used in expenses
- [ ] **USERS**: Verify supervisor relationships work
- [ ] **COUNTRIES**: Verify countries appear in all dropdowns
- [ ] **REPORTS**: Verify expense totals are calculated correctly

### Step 7.2: Refresh & Persistence Tests  
- [ ] Refresh each page multiple times
- [ ] **VERIFICATION**: All data persists across refreshes
- [ ] **RESTART TEST**: Restart browser, data should persist
- [ ] **LOGIN PERSISTENCE**: JWT should maintain session

### Step 7.3: Dashboard Final Check
- [ ] **LOGIN SWITCH**: Login as `test@test.com` (superuser)
- [ ] Navigate to Dashboard
- [ ] **VERIFICATION**: Dashboard shows updated statistics:
  - Total users: 3
  - Pending approvals: 0  
  - Recent activity reflects actual workflow

---

## 🎯 **SUCCESS CRITERIA**

### ✅ **COMPLETE SUCCESS IF:**
1. All users can be created and login successfully
2. All CRUD operations work (Create, Read, Update, Delete)
3. Data persists across page refreshes and browser restarts  
4. Cross-module integration works (dropdowns, relationships)
5. Approval workflow functions end-to-end
6. Status changes propagate correctly
7. Dashboard reflects real data
8. No console errors or broken functionality

### ⚠️ **PARTIAL SUCCESS IF:**
- Core workflow works but some UI features missing
- Data persists but some cross-module references fail
- Approval works but status updates delayed

### ❌ **FAILURE IF:**
- Cannot login or major authentication issues
- Data doesn't persist after refresh
- CRUD operations fail
- Cross-module data not shared
- Workflow broken at any step

---

## 🐛 **TROUBLESHOOTING**

### Common Issues:
1. **Login fails**: Check backend logs, verify user exists
2. **Data doesn't persist**: Check database connection
3. **Cross-module data missing**: Verify API endpoints work
4. **Approval workflow broken**: Check user roles and permissions
5. **Console errors**: Check network tab, API responses

### Quick Fixes:
```bash
# Restart services if needed
docker compose restart

# Check logs
docker compose logs backend
docker compose logs frontend
```

---

## 📊 **TESTING RESULTS**

**Date:** ___________  
**Tester:** ___________

| Phase | Status | Issues | Notes |
|-------|--------|--------|-------|
| Authentication | ⬜ Pass ⬜ Fail | | |
| Master Data | ⬜ Pass ⬜ Fail | | |
| User Management | ⬜ Pass ⬜ Fail | | |
| Prepayment Flow | ⬜ Pass ⬜ Fail | | |
| Expense Management | ⬜ Pass ⬜ Fail | | |
| Approval Workflow | ⬜ Pass ⬜ Fail | | |
| Data Persistence | ⬜ Pass ⬜ Fail | | |

**Overall Result:** ⬜ Complete Success ⬜ Partial Success ⬜ Needs Work

**Next Steps:** ___________
