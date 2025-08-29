# Viaticos 2025 - Project Overview

## 🎯 Project Purpose
Viaticos 2025 is a comprehensive travel expense management system designed to streamline the entire lifecycle of business travel expenses, from initial prepayment requests to final expense reporting and approval.

## 📋 Project Status
**Status:** Definition Phase Complete ✅  
**Next Phase:** Development Planning

## 📁 Documentation Structure

### Core Documents
1. **[PROJECT_DEFINITION.md](./PROJECT_DEFINITION.md)** - Complete project requirements and specifications
2. **[TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)** - Technical implementation details and architecture

### Visual Documentation
- **Entity Relationship Diagram** - Database structure and relationships
- **Approval Workflow Diagram** - Business process flows
- **Technical Architecture Diagram** - System component overview

## 🏗️ System Architecture

### Technology Stack
- **Frontend:** React + TypeScript + Node.js
- **Backend:** Python + FastAPI
- **Database:** SQL Server (Production) / PostgreSQL (Testing)
- **Deployment:** Docker containers on Windows Server 2022
- **File Storage:** Local file system with 10MB limit

### Key Features
- **Multi-language Support:** Spanish (primary) and English
- **Role-based Access Control:** Employee, Manager, Accounting, Treasury, Superuser
- **Approval Workflows:** Hierarchical approval process
- **Document Management:** File upload and management
- **Export Capabilities:** CSV, Excel, PDF formats
- **Dashboard Analytics:** Real-time expense tracking and reporting

## 🔄 Approval Hierarchy

### Prepayment & Travel Expense Report Workflow
1. **User Supervisor** → 2. **Accounting Users** → 3. **Treasury Users**

- Any user at accounting/treasury level can approve (first wins)
- Email notifications at each stage
- Complete audit trail maintained
- Rejection at any level returns to requester

## 📊 Data Model Overview

### Core Entities
- **User** - System users with roles and permissions
- **Country** - Master list of countries and currencies
- **Prepayment** - Travel advance requests
- **Travel Expense Report** - Auto-generated from approved prepayments
- **Expense** - Individual expense line items
- **Expense Category** - Expense classification with alert thresholds
- **Approval** - Workflow tracking and management

### Business Rules
- Prepayments automatically create expense reports when approved
- Expenses inherit country/currency from expense reports
- Category-based amount alerts warn users of high expenses
- Complete audit trail for all approval actions

## 🚀 Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- User management and authentication
- Basic data models setup
- Core UI framework

### Phase 2: Workflow Engine (Weeks 5-8)
- Approval hierarchy implementation
- Email notification system
- Audit trail tracking

### Phase 3: Expense Management (Weeks 9-12)
- Expense entry and management
- Document upload functionality
- Category-based alerts

### Phase 4: Reporting & Analytics (Weeks 13-16)
- Dashboard implementation
- Export capabilities
- Advanced reporting features

### Phase 5: Polish & Deploy (Weeks 17-20)
- Performance optimization
- Security hardening
- Production deployment

## 🎨 Dashboard Features

### Main Dashboard
- Pending prepayment counts
- Total amounts by status (pending/approved)
- Monthly expense trends (line chart)
- Category-wise expense breakdown

### Proposed Additional Dashboards
- **Management Dashboard:** Departmental analysis, approval bottlenecks
- **User Dashboard:** Personal history, pending items
- **Financial Dashboard:** Cash flow projections, tax summaries

## 🔐 Security Considerations

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- File upload security and validation
- Input sanitization and XSS protection
- Comprehensive audit logging

## 🌐 Internationalization

### Supported Languages
- **Spanish (ES):** Primary language with dd/mm/yyyy dates
- **English (EN):** Secondary language with mm/dd/yyyy dates

### Localization Features
- Dynamic language switching
- Locale-aware date/number formatting
- Translated email notifications

## 📧 Notification System

### Email Types
- **Approval Requests:** Sent to designated approvers
- **Rejection Notices:** Sent to requesters with reasons
- **Completion Notifications:** Final approval confirmations

### Technical Implementation
- SMTP-based email delivery
- HTML email templates
- Async processing with retry logic

## 💾 Export Capabilities

### Report Formats
- **CSV:** Pipe-separated format for approved expense reports
- **Excel:** Formatted spreadsheets with multiple sheets
- **PDF:** Professional reports for presentations

### Bulk Operations
- Date range selection for multiple reports
- Batch processing for large datasets
- Background processing for performance

## 🔧 Development Setup

### Prerequisites
- Docker Desktop
- Node.js 18+ LTS
- Python 3.11+
- SQL Server 2022 or PostgreSQL 15+

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd viaticos2025

# Start services
docker-compose up -d

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Database: localhost:1433 (SQL Server)
```

## 📈 Success Metrics

### Performance Targets
- Dashboard load time: < 3 seconds
- API response time: < 500ms (95th percentile)
- File upload: < 30 seconds for 10MB files

### User Experience Goals
- Intuitive approval workflow
- Mobile-responsive design
- Minimal training required
- 99% uptime availability

## 🤝 Team Roles

### Development Team Structure
- **Project Manager:** Overall coordination and timeline management
- **Frontend Developer:** React application development
- **Backend Developer:** Python API and business logic
- **Database Administrator:** SQL Server setup and optimization
- **DevOps Engineer:** Docker deployment and monitoring
- **UX/UI Designer:** User interface and experience design

## 📞 Support and Maintenance

### Post-Deployment Support
- **Level 1:** User support and basic troubleshooting
- **Level 2:** Application bug fixes and minor enhancements
- **Level 3:** Infrastructure and major system changes

### Maintenance Schedule
- **Daily:** System health monitoring
- **Weekly:** Performance review and optimization
- **Monthly:** Security updates and backup verification
- **Quarterly:** Feature enhancement planning

---

## 🎉 Project Deliverables Summary

✅ **Complete Project Definition** - Comprehensive requirements document  
✅ **Technical Architecture** - Detailed implementation specifications  
✅ **Database Design** - Entity relationship model with constraints  
✅ **Workflow Documentation** - Approval process flows  
✅ **Security Framework** - Authentication and authorization model  
✅ **Implementation Roadmap** - Phased development approach  

**Ready for Development Phase** 🚀

---

*This document serves as the primary entry point for understanding the Viaticos 2025 project. For detailed specifications, refer to the individual documentation files.*

