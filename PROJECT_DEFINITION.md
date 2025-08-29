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
- **Operating System:** Windows Server 2022
- **Containerization:** Docker
- **Frontend:** Node.js + React
- **Backend:** Python
- **Database:** 
  - Production: SQL Server
  - Testing: PostgreSQL

### 2.2 Deployment Architecture
- Containerized application using Docker
- Windows Server 2022 host environment
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
- **Currency:** Based on country selection

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
- `currency` (String, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Ordered by name for display
- Administered by superusers only

### 4.3 Expense Category
**Purpose:** Categories for expense classification

**Fields:**
- `id` (Primary Key, Auto-increment)
- `name` (String, Mandatory, Unique)
- `account` (String, Mandatory)
- `alert_amount` (Decimal, Optional, 2 decimals)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Only accessible by superusers
- Alert amount triggers warning when expenses exceed this threshold

### 4.4 Factura Supplier
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

### 4.5 Prepayment
**Purpose:** Travel advance payment requests

**Fields:**
- `id` (Primary Key, Auto-increment)
- `reason` (Text, Mandatory)
- `destination_country_id` (Foreign Key to Country, Mandatory)
- `start_date` (Date, Mandatory)
- `end_date` (Date, Mandatory)
- `currency` (String, Mandatory, Auto-filled from country)
- `amount` (Decimal, Mandatory, 2 decimals)
- `justification_file` (String, Optional, File path)
- `comment` (Text, Optional)
- `status` (Enum: 'pending', 'in_progress', 'approved', 'rejected', Default: 'pending')
- `requesting_user_id` (Foreign Key to User, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- End date must be after start date
- Status is system-controlled through approval workflow
- Currency auto-filled but can be modified

### 4.6 Travel Expense Report
**Purpose:** Expense reports linked to prepayments

**Fields:**
- `id` (Primary Key, Auto-increment)
- `prepayment_id` (Foreign Key to Prepayment, Mandatory, Unique)
- `status` (Enum: 'pending', 'in_progress', 'approved', 'rejected', Default: 'pending')
- `requesting_user_id` (Foreign Key to User, Mandatory)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Calculated Fields:**
- `prepaid_amount` (From related prepayment)
- `expense_amount` (Sum of related expenses)
- `budget_status` (Enum: 'Under-Budget', 'Over-Budget')

**Business Rules:**
- Created automatically when prepayment is approved
- Cannot be created manually
- Budget status: Over-Budget when expense_amount > prepaid_amount

### 4.7 Expense
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
- `country_id` (Foreign Key to Country, Inherited from expense report)
- `currency` (String, Inherited from expense report)
- `amount` (Decimal, Mandatory, 2 decimals)
- `document_number` (String, Mandatory)
- `taxable` (Enum: 'Si', 'No', Default: 'No', Conditional: Only for Factura)
- `document_file` (String, Optional, File path)
- `comments` (Text, Optional)
- `status` (Enum: 'pending', 'in_process', 'approved', Default: 'pending')
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Business Rules:**
- Country and currency inherited from travel expense report
- Supplier field requirements based on document type
- Amount alert triggered if exceeds category alert amount

### 4.8 Approval
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

### 4.9 Approval History
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
1. **User Supervisor** (User with supervisor relationship)
2. **Accounting Users** (Any user with profile = 'accounting' AND is_approver = true)
3. **Treasury Users** (Any user with profile = 'treasury' AND is_approver = true)

### 6.2 Travel Expense Report Approval Hierarchy
1. **User Supervisor** (User with supervisor relationship)
2. **Accounting Users** (Any user with profile = 'accounting' AND is_approver = true)
3. **Treasury Users** (Any user with profile = 'treasury' AND is_approver = true)

### 6.3 Workflow Process
1. **Initiation:** Status changes from 'pending' to 'in_progress'
2. **Sequential Approval:** Each level must approve before proceeding to next
3. **Parallel Processing:** Multiple users at same level can approve (first one wins)
4. **Completion:** Final approval changes status to 'approved'
5. **Rejection:** Any level can reject, returning to 'rejected' status

### 6.4 Notification System
- **Approval Request:** Email to approver with summary and approval link
- **Rejection Notice:** Email to requester with rejection reason and details
- **Approval Completion:** Email to requester when fully approved

## 7. Core Features

### 7.1 Dashboard
**Main Dashboard includes:**
- Count of prepayments pending approval
- Total amount of travel expense reports with status 'pending'
- Total amount of expenses with status 'pending'
- Total amount of expenses with status 'approved'
- Monthly expenses line chart (with totals above each month)
- Expenses per category line chart (with totals)

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


