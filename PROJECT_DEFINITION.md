# Viaticos 2025 - Project Definition Document

## 1. Project Overview

**Application Name:** Viaticos 2025  
**Purpose:** Travel Expense Management System  
**Version:** 1.0  
**Date:** 2025

### 1.1 Description
Viaticos 2025 is a comprehensive travel expense management system that handles the complete lifecycle of business travel expenses, from prepayment requests to final expense reporting and approval. The system manages travel allowances, expense tracking, approval workflows, and provides comprehensive reporting capabilities.

## 2. Technical Architecture

### 2.1 Technology Stack
- **Operating System:** Ubuntu 22.04 LTS
- **Containerization:** Docker + Docker Compose
- **Frontend:** React (Node.js 18)
- **Backend:** FastAPI (Python 3.11)
- **Database:** PostgreSQL (local and production)

### 2.2 Deployment Architecture
- Containerized application using Docker
- DigitalOcean Droplet host environment
- Nginx reverse proxy in front of containers
- Multi-tier architecture (Frontend, Backend, Database)

### 2.3 File Storage
- **Type:** Local file system
- **Size Limit:** 10MB per file
- **Supported Types:** All standard document formats (PDF, DOC, XLS, JPG, PNG, etc.)

## 3. Internationalization

### 3.1 Supported Languages
- **Spanish (ES):** Primary language
- **English (EN):** Secondary language

### 3.2 Localization Settings
- **Date Format:**
  - Spanish: dd/mm/yyyy
  - English: mm/dd/yyyy
- **Number Format:** ###,###,###.## (consistent across languages)
- **Currency:** Selected independently from the Currencies master (not tied to country). Dashboard has independent Country and Currency filters.

## 4. Data Model

### 4.1 User
**Purpose:** Application users with different access levels and roles

**Fields:**
- `id` (Primary Key, Auto-increment)
- `email` (String, Mandatory, Unique)
- `name` (String, Mandatory)
- `surname` (String, Mandatory)
- `password` (String, Encrypted, Non-displayed)
- `sap_code` (String, Mandatory)
- `country_id` (Foreign Key, Mandatory)
- `cost_center` (String, Mandatory)
- `credit_card_number` (String, Optional)
- `supervisor_id` (Foreign Key to User, Optional, Cannot be self)
- `profile` (Enum: 'employee', 'manager', 'accounting', 'treasury', Mandatory)
- `is_superuser` (Boolean, Default: false)
- `is_approver` (Boolean, Default: false)
- `force_password_change` (Boolean, Default: true)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- First login requires password change
- Can be deleted only if no associated transactions exist
- Supervisor cannot be the user themselves

### 4.2 Country
**Purpose:** Master list of countries for travel destinations

**Fields:**
- `id` (Primary Key, Auto-increment)
- `name` (String, Mandatory, Unique)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Ordered by name for display
- Administered by superusers only
- Currency is now selected independently via Currency master

### 4.3 Currency
**Purpose:** Master list of currencies for financial operations

**Fields:**
- `id` (Primary Key, Auto-increment)
- `name` (String, Mandatory, Unique) - e.g., "Peruvian Sol"
- `code` (String, Mandatory, Unique) - e.g., "PEN"
- `symbol` (String, Optional) - e.g., "S/"
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Ordered by name for display
- Administered by superusers only
- Used for independent currency selection in prepayments and expenses

### 4.4 Expense Category
**Purpose:** Categories for expense classification

**Fields:**
- `id` (Primary Key, Auto-increment)
- `name` (String, Mandatory, Unique)
- `account` (String, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Only accessible by superusers
- Alerts are configured per Category+Country+Currency in `category_country_alerts` with amount and optional message

### 4.5 Factura Supplier
**Purpose:** Suppliers for formal invoices (facturas)

**Fields:**
- `id` (Primary Key, Auto-increment)
- `name` (String, Mandatory)
- `sap_code` (String, Mandatory, Unique)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Only accessible by superusers
- Can be deleted only if no associated transactions exist

### 4.6 Prepayment
**Purpose:** Travel advance payment requests

**Fields:**
- `id` (Primary Key, Auto-increment)
- `reason` (Text, Mandatory)
- `destination_country_id` (Foreign Key to Country, Mandatory)
- `start_date` (Date, Mandatory)
- `end_date` (Date, Mandatory)
- `currency_id` (Foreign Key to Currency, Mandatory)
- `amount` (Decimal, Mandatory, 2 decimals)
- `justification_file` (String, Optional, File path)
- `comment` (Text, Optional)
- `status` (Enum: 'PENDING', 'SUPERVISOR_PENDING', 'ACCOUNTING_PENDING', 'TREASURY_PENDING', 'APPROVED', 'REJECTED', Default: 'PENDING')
- `requesting_user_id` (Foreign Key to User, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- End date must be after start date
- Status is system-controlled through the approval workflow (see Section 6)
- Status mapping (customer-facing labels):
  - PENDING → "Pending"
  - SUPERVISOR_PENDING → "Supervisor Pending"
  - ACCOUNTING_PENDING → "Accounting Pending"
  - TREASURY_PENDING → "Treasury Pending"
  - APPROVED → "Approved"
  - REJECTED → "Rejected"
- Currency selected independently from country

Frontend status labels (EN/ES):
  - PENDING: "Pending" / "Pendiente"
  - SUPERVISOR_PENDING: "Supervisor Pending" / "Pend. Jefatura"
  - ACCOUNTING_PENDING: "Accounting Pending" / "Pend. Contabilidad"
  - TREASURY_PENDING: "Treasury Pending" / "Pend. Tesorería"
  - APPROVED: "Approved" / "Aprobado"
  - REJECTED: "Rejected" / "Rechazado"

### 4.7 Travel Expense Report
**Purpose:** Expense reports linked to prepayments or created manually for reimbursements

**Fields:**
- `id` (Primary Key, Auto-increment)
- `prepayment_id` (Foreign Key to Prepayment, Optional, Unique when present)
- `report_type` (Enum: 'PREPAYMENT', 'REIMBURSEMENT', Mandatory)
- `reason` (Text, Optional; required for REIMBURSEMENT)
- `country_id` (Foreign Key to Country; inherited for PREPAYMENT, required for REIMBURSEMENT)
- `currency_id` (Foreign Key to Currency; inherited for PREPAYMENT, required for REIMBURSEMENT)
- `status` (Enum: 'pending', 'approved', 'rejected', Default: 'pending')
- `requesting_user_id` (Foreign Key to User, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Calculated Fields:**
- `prepaid_amount` (From related prepayment)
- `expense_amount` (Sum of related expenses)
- `budget_status` (Enum: 'Under-Budget', 'Over-Budget')

**Business Rules:**
- Created automatically when prepayment is approved (report_type=PREPAYMENT) or manually as REIMBURSEMENT.
- Budget status: Over-Budget when expense_amount > prepaid_amount (for PREPAYMENT reports).

### 4.8 Expense
**Purpose:** Individual expense entries

**Fields:**
- `id` (Primary Key, Auto-increment)
- `category_id` (Foreign Key to Expense Category, Mandatory)
- `travel_expense_report_id` (Foreign Key to Travel Expense Report, Mandatory)
- `purpose` (String, Mandatory)
- `document_type` (Enum: 'Boleta', 'Factura', Mandatory)
- `boleta_supplier` (String, Conditional: Required when document_type = 'Boleta')
- `factura_supplier_id` (Foreign Key to Factura Supplier, Conditional: Required when document_type = 'Factura')
- `expense_date` (Date, Mandatory)
- `country_id` (Foreign Key to Country)  
  Inherited from report when linked; required explicitly for reimbursements.
- `currency_id` (Foreign Key to Currency)  
  Inherited from report when linked; required explicitly for reimbursements.
- `amount` (Decimal, Mandatory, 2 decimals)
- `document_number` (String, Mandatory)
- `taxable` (Enum: 'Si', 'No', Default: 'No', Conditional: Only for Factura)
- `document_file` (String, Optional, File path)
- `comments` (Text, Optional)
- `status` (Enum: 'pending', 'in_process', 'approved', Default: 'pending')
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `created_by_user_id` (Foreign Key to User, Optional)  
  Set to the creator for reimbursements.

**Business Rules:**
- Expense must belong to a report (prepayment-based or reimbursement report).
- Country and currency default values are inherited from the selected report. Upon creation or edit, the user can change these values.
- Supplier field requirements based on document type
- Amount alert triggered if exceeds category alert amount

### 4.9 Approval
**Purpose:** Approval workflow tracking

**Fields:**
- `id` (Primary Key, Auto-increment)
- `entity_type` (Enum: 'prepayment', 'travel_expense_report', Mandatory)
- `entity_id` (Integer, Mandatory)
- `approver_user_id` (Foreign Key to User, Mandatory)
- `status` (Enum: 'pending', 'approved', 'rejected', Default: 'pending')
- `approval_level` (Integer, Mandatory)
- `rejection_reason` (Text, Optional)
- `approved_at` (DateTime, Optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### 4.10 Approval History
**Purpose:** Complete audit trail of approval actions

**Fields:**
- `id` (Primary Key, Auto-increment)
- `entity_type` (Enum: 'prepayment', 'travel_expense_report', Mandatory)
- `entity_id` (Integer, Mandatory)
- `user_id` (Foreign Key to User, Mandatory)
- `user_role` (String, Mandatory)
- `action` (Enum: 'submitted', 'approved', 'rejected', 'returned', Mandatory)
- `from_status` (String, Mandatory)
- `to_status` (String, Mandatory)
- `comments` (Text, Optional)
- `created_at` (DateTime)

## 5. User Roles and Permissions

### 5.1 Employee (profile = 'employee')
- Create and manage own prepayments and expenses
- View own travel expense reports
- Upload supporting documents

### 5.2 Manager (profile = 'manager')
- All Employee permissions
- Additional reporting capabilities (if is_approver = true)

### 5.3 Accounting (profile = 'accounting')
- All Employee permissions
- Approve requests in approval workflow (if is_approver = true)
- Access accounting reports

### 5.4 Treasury (profile = 'treasury')
- All Employee permissions
- Final approval in workflow (if is_approver = true)
- Generate export files for approved reports

### 5.5 Superuser (is_superuser = true)
- Full system administration access
- Manage Countries, Expense Categories, Factura Suppliers
- User management capabilities
- System configuration

### 5.6 Approver (is_approver = true)
- Access to approval module
- Can approve/reject requests based on approval hierarchy

## 6. Approval Workflows

### 6.1 Prepayment Approval Hierarchy
1. **User Supervisor** (Supervisor of the requester; must have is_approver = true)
2. **Accounting Users** (Any user with profile = 'accounting' AND is_approver = true; first approval wins)
3. **Treasury Users** (Any user with profile = 'treasury' AND is_approver = true; final approval)

### 6.2 Travel Expense Report Approval Hierarchy
1. **User Supervisor** (User with supervisor relationship)
2. **Accounting Users** (Any user with profile = 'accounting' AND is_approver = true)
3. **Treasury Users** (Any user with profile = 'treasury' AND is_approver = true)

### 6.3 Workflow Process (Prepayment)
1. **Submit for Approval**: Requester triggers submit; validations:
   - If no supervisor → 400 "Missing supervisor" (no status change)
   - If supervisor exists but is not approver → 400 "Supervisor do not have approval permits" (no status change)
   - Otherwise set status → SUPERVISOR_PENDING
2. **Supervisor Approval**: If approved → status → ACCOUNTING_PENDING. If rejected → status → REJECTED.
   - If there are no accounting approvers → revert status → PENDING; append comment "errors on approval - missing accounting user"; return 400 "Error - no accounting users available".
3. **Accounting Approval**: If approved → status → TREASURY_PENDING. If rejected → status → REJECTED.
   - If there are no treasury approvers → revert status → PENDING; append comment "errors on approval - missing treasury user"; return 400 "Error - no treasury users available".
4. **Treasury Approval**: If approved → status → APPROVED and automatically create a Travel Expense Report (if one does not already exist). If rejected → status → REJECTED.
5. **Re-approval Rules**: Once a prepayment is APPROVED it cannot be approved again; only superusers may delete it.

Note: Travel Expense Report approval hierarchy uses the same three-step chain and can be defined analogously once prepayment flow is finalized.

### 6.4 Approval API Endpoints (Prepayment)
- `POST /api/approvals/prepayments/{id}/submit` → Submit for approval (transitions to SUPERVISOR_PENDING with validations)
- `POST /api/approvals/prepayments/{id}/approve` → Approve/Reject at the current stage
- `GET /api/approvals/pending` → Returns items the current user can act on, filtered by role and current stage

### 6.4 Notification System
- **Approval Request:** Email to approver with summary and approval link
- **Rejection Notice:** Email to requester with rejection reason and details
- **Approval Completion:** Email to requester when fully approved

## 7. Core Features

### 7.1 Dashboard
**Main Dashboard includes:**
- Count of prepayments pending approval (includes PENDING, SUPERVISOR_PENDING, ACCOUNTING_PENDING, TREASURY_PENDING)
- Total amount of travel expense reports with status 'pending'
- Total amount of expenses with status 'pending'
- Total amount of expenses with status 'approved'
- Monthly expenses line chart (with totals above each month)
- Expenses per category line chart (with totals)
- **Independent filters for Country and Currency** (amounts displayed in selected currency)
- Currency selection affects all monetary displays and calculations

### 7.2 Expense Amount Alerts
- Category-based alert thresholds
- Warning message displayed before saving if expense exceeds alert amount
- User can proceed after acknowledging alert

### 7.3 Export Capabilities

#### 7.3.1 Travel Expense Report CSV Export
- Available only for approved travel expense reports
- Pipe (|) separated format
- Contains all expenses associated with the report
- Individual report export

#### 7.3.2 Bulk Export
- Date range selection for approved expense reports
- Multiple format support (CSV, Excel, PDF)
- Batch processing capability

## 8. Additional Dashboard Proposals

### 8.1 Management Dashboard
- **Top Spending Departments:** Cost center analysis
- **Average Processing Time:** Time from submission to approval
- **Approval Bottlenecks:** Identification of delayed approvals
- **Expense Trends:** Year/Month-over-year/Month comparison

### 8.2 User Dashboard
- **Personal Expense History:** Last 12 months
- **Pending Approvals:** Items awaiting user's approval
- **Recent Activity:** Latest submissions and status changes
- **Spending by Category:** Personal expense breakdown


## 9. Business Rules Summary

### 9.1 Data Validation
- Mandatory fields enforcement
- Date logic validation (end date > start date)
- File size limits (10MB maximum)
- Unique constraints where specified

### 9.2 Security Rules
- Password change required on first login
- Role-based access control
- File upload security validation
- Session management

### 9.3 Process Rules
- Sequential approval workflow
- Automatic travel expense report creation upon prepayment approval
- Category-based expense alerts
- Audit trail maintenance

## 10. Non-Functional Requirements

### 10.1 Performance
- Support for concurrent users (estimate based on organization size)
- Fast dashboard loading (<3 seconds)
- Efficient file upload and storage

### 10.2 Scalability
- Containerized architecture for easy scaling
- Database optimization for large datasets
- Modular frontend components

### 10.3 Reliability
- Data backup and recovery procedures
- Error handling and logging
- Graceful degradation for system issues

### 10.4 Usability
- Intuitive user interface
- Mobile-responsive design
- Multi-language support
- Accessibility compliance

## 11. Implementation Phases

### Phase 1: Core System
- User management and authentication
- Basic data models (User, Country, Categories)
- Prepayment creation and basic workflow

### Phase 2: Approval Workflow
- Complete approval hierarchy implementation
- Email notification system
- Approval history tracking

### Phase 3: Expense Management
- Travel expense report creation
- Expense entry and management
- Document upload functionality

### Phase 4: Reporting & Analytics
- Dashboard implementation
- Export capabilities
- Advanced reporting features

### Phase 5: Enhancement & Optimization
- Performance optimization
- Additional dashboard features
- User experience improvements

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Next Review:** Upon development start


