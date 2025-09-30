# 📊 Expense Reports Approval Process - Complete Flowchart

## Overview
This document describes the complete approval workflow for Travel Expense Reports in the Viaticos 2025 system.

---

## 🔄 Complete Approval Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMPLOYEE CREATES REPORT                             │
│                              (Status: PENDING)                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Employee Submits for │
                    │  Approval             │
                    └───────────┬───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: SUPERVISOR APPROVAL                             │
│                        (Status: SUPERVISOR_PENDING)                         │
│                                                                             │
│  Approver: Direct Supervisor (MANAGER profile)                              │
│  Actions:  - Quick Approve All                                              │
│            - Approve All                                                    │
│            - Reject Report                                                  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
         ✅ APPROVED                      ❌ REJECTED
                │                               │
                │                               └──────────► REJECTED (Final)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   STAGE 2: ACCOUNTING APPROVAL                              │
│                       (Status: ACCOUNTING_PENDING)                          │
│                                                                             │
│  Approver: Accounting Team (ACCOUNTING profile)                             │
│  Actions:  - Review individual expenses                                     │
│            - Approve/Reject each expense                                    │
│            - Generate SAP Compensation File                                 │
│            - Complete Accounting Approval with SAP #                        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                ▼                                ▼
         ✅ APPROVED                       ❌ REJECTED
                │                                │
                │                                └──────────► REJECTED (Final)
                │
                │ (Accounting completes with SAP compensation number)
                │
                ▼
    ┌───────────────────────────────────────────┐
    │  BUSINESS LOGIC: Compare Total vs Prepaid │
    └───────────┬───────────────────────────────┘
                │
    ┌───────────┼───────────────────────────────┐
    │           │                               │
    ▼           ▼                               ▼
┌────────┐  ┌─────────┐                ┌──────────────┐
│ EQUAL  │  │  OVER   │                │  UNDER       │
│ BUDGET │  │ BUDGET  │                │  BUDGET      │
└───┬────┘  └────┬────┘                └──────┬───────┘
    │            │                             │
    │            │                             │
    ▼            ▼                             ▼
┌────────────┐ ┌──────────────────────┐  ┌────────────────────────┐
│ APPROVED_  │ │ APPROVED_FOR_        │  │ FUNDS_RETURN_PENDING   │
│ EXPENSES   │ │ REIMBURSEMENT        │  │                        │
│ (Final)    │ │ (Needs Treasury)     │  │ (Employee Action Req.) │
└────────────┘ └──────────┬───────────┘  └────────┬───────────────┘
                          │                       │
                          │                       │ Employee submits
                          │                       │ fund return docs
                          │                       │
                          │                       ▼
                          │              ┌─────────────────────┐
                          │              │  REVIEW_RETURN      │
                          │              │  (Treasury Review)  │
                          │              └─────────┬───────────┘
                          │                        │
                          └────────────┬───────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   STAGE 3: TREASURY APPROVAL                                │
│          (Status: APPROVED_FOR_REIMBURSEMENT or REVIEW_RETURN)              │
│                                                                             │
│  Approver: Treasury Team (TREASURY profile)                                 │
│  Actions:  - Approve Reimbursement                                          │
│            - Approve Fund Return                                            │
│            - Reject (sends back for resubmission if REVIEW_RETURN)          │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
         ✅ APPROVED                      ❌ REJECTED
                │                               │
    ┌───────────┴───────────┐                  │
    ▼                       ▼                   │
┌────────────────┐  ┌──────────────────────┐   │
│ APPROVED_      │  │ APPROVED_RETURNED_   │   │
│ REPAID         │  │ FUNDS                │   │
│ (Reimbursement)│  │ (Fund Return)        │   │
│ (Final)        │  │ (Final)              │   │
└────────────────┘  └──────────────────────┘   │
                                               │
                                               │ (If REVIEW_RETURN rejected)
                                               ▼
                                    ┌────────────────────────┐
                                    │ FUNDS_RETURN_PENDING   │
                                    │ (Re-submit docs)       │
                                    └────────────────────────┘
```

---

## 📋 Status Definitions

### **Employee Statuses**
| Status | Description | Who Can Act |
|--------|-------------|-------------|
| `PENDING` | Report created, not yet submitted | Employee (owner) |
| `REJECTED` | Report rejected by any approver | Employee (can resubmit) |
| `FUNDS_RETURN_PENDING` | Employee must submit fund return documents | Employee (owner) |

### **Approval Workflow Statuses**
| Status | Description | Approver | Next Action |
|--------|-------------|----------|-------------|
| `SUPERVISOR_PENDING` | Awaiting supervisor/manager approval | Direct Supervisor (MANAGER) | Approve → ACCOUNTING_PENDING<br>Reject → REJECTED |
| `ACCOUNTING_PENDING` | Awaiting accounting approval | Accounting Team | Approve → (Business Logic) |
| `REVIEW_RETURN` | Treasury reviewing fund return documents | Treasury Team | Approve → APPROVED_RETURNED_FUNDS<br>Reject → FUNDS_RETURN_PENDING |
| `APPROVED_FOR_REIMBURSEMENT` | Awaiting treasury to process reimbursement | Treasury Team | Approve → APPROVED_REPAID |

### **Final Statuses**
| Status | Description | Meaning |
|--------|-------------|---------|
| `APPROVED_EXPENSES` | All expenses approved, amounts match | ✅ Process complete (no treasury needed) |
| `APPROVED_REPAID` | Reimbursement approved and processed | ✅ Process complete (overpayment returned to employee) |
| `APPROVED_RETURNED_FUNDS` | Fund return approved | ✅ Process complete (underspending funds returned) |
| `REJECTED` | Report rejected | ❌ Process terminated (can be resubmitted) |

---

## 🔀 Business Logic Decision Points

### **After Accounting Approval**

The system automatically determines the next status based on expense totals vs. prepayment:

```python
total_expenses = sum(all_approved_expenses)
prepaid_amount = prepayment.amount  # 0 for reimbursement reports

if prepayment_exists AND total_expenses == prepaid_amount:
    ✅ APPROVED_EXPENSES (Final - No treasury needed)
    
elif total_expenses > prepaid_amount:
    ⏩ APPROVED_FOR_REIMBURSEMENT (Needs treasury to pay difference)
    
else:  # total_expenses < prepaid_amount
    ⏩ FUNDS_RETURN_PENDING (Employee must return excess funds)
```

---

## 👥 Approver Permissions

| Role | Profile | Can Approve Status |
|------|---------|-------------------|
| **Supervisor** | `MANAGER` | `SUPERVISOR_PENDING` (only their direct reports) |
| **Accounting** | `ACCOUNTING` | `ACCOUNTING_PENDING` |
| **Treasury** | `TREASURY` | `APPROVED_FOR_REIMBURSEMENT`, `REVIEW_RETURN` |
| **Superuser** | Any + `is_superuser=true` | All statuses (override) |

---

## 🔄 Special Workflows

### **Fund Return Process**
When expenses are less than prepayment:

1. **Accounting approves** → Status: `FUNDS_RETURN_PENDING`
2. **Employee uploads** return documents (receipt, document #) → Status: `REVIEW_RETURN`
3. **Treasury reviews** documents:
   - ✅ Approve → `APPROVED_RETURNED_FUNDS` (Final)
   - ❌ Reject → Back to `FUNDS_RETURN_PENDING` (resubmit)

### **Reimbursement Process**
When expenses exceed prepayment:

1. **Accounting approves** → Status: `APPROVED_FOR_REIMBURSEMENT`
2. **Treasury processes** payment → Status: `APPROVED_REPAID` (Final)

### **Quick Approval**
Supervisors and Treasury can use "Quick Approve" to approve all expenses at once without individual review.

---

## 📄 SAP Integration

### **Accounting Stage**
- Generate SAP Compensation File (text file with expense data)
- Enter SAP Compensation Number
- Complete approval (triggers business logic)

### **SAP File Contents**
The SAP compensation file includes:
- Company header
- Expense lines (FACTURA first, then BOLETA)
- Document types: `COMPENSACION` (without accent)
- Conditional SAP code (empty if expenses approved, requesting user's SAP code otherwise)

---

## 🎯 Key Business Rules

1. **Submission Requirements**:
   - Report must have at least one expense
   - Credit card imported expenses must be complete (category, purpose, document #)

2. **Supervisor Approval**:
   - Must be direct supervisor of requesting employee
   - Can quick approve or approve all

3. **Accounting Approval**:
   - Can approve/reject individual expenses
   - Must generate SAP file before completing
   - Must enter SAP compensation number

4. **Treasury Approval**:
   - Only triggered for over/under budget reports
   - Equal budget reports skip treasury

5. **Rejection**:
   - Any stage can reject the entire report
   - Rejected reports return to `REJECTED` status
   - Employee can resubmit after corrections
   - Special case: Fund return rejection sends back to `FUNDS_RETURN_PENDING`

---

## 📧 Email Notifications

Email notifications are sent asynchronously for:
- Report submitted for approval
- Report approved (at each stage)
- Report rejected
- Fund return documents required
- Reimbursement approved

---

## 📊 Approval History

All approval actions are logged in `approval_history` table:
- Entity type: `TRAVEL_EXPENSE_REPORT`
- User who acted
- Action: `SUBMITTED`, `APPROVED`, `REJECTED`
- Status transition (from → to)
- Comments
- Timestamp

---

## 🔍 Quick Reference

### Status Flow (Linear Path - Happy Case)
```
PENDING 
  → SUPERVISOR_PENDING 
    → ACCOUNTING_PENDING 
      → APPROVED_EXPENSES (if equal budget)
```

### Status Flow (Over Budget Path)
```
PENDING 
  → SUPERVISOR_PENDING 
    → ACCOUNTING_PENDING 
      → APPROVED_FOR_REIMBURSEMENT 
        → APPROVED_REPAID
```

### Status Flow (Under Budget Path)
```
PENDING 
  → SUPERVISOR_PENDING 
    → ACCOUNTING_PENDING 
      → FUNDS_RETURN_PENDING 
        → REVIEW_RETURN 
          → APPROVED_RETURNED_FUNDS
```

---

**Last Updated**: September 30, 2025  
**System Version**: Viaticos 2025 v1.0  
**Domain**: https://amcor-viaticos2025.tech-labs.org
