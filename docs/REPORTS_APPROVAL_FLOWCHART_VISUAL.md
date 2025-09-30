# 📊 Expense Reports Approval Process - Visual Flowchart

## Interactive Visual Diagram

Copy the code below and paste it into:
- **GitHub** (renders automatically in .md files)
- **Mermaid Live Editor**: https://mermaid.live
- **Notion**, **Confluence**, or any Mermaid-compatible tool

---

## 🔄 Complete Approval Workflow

```mermaid
flowchart TD
    Start([Employee Creates Report]) --> Pending[PENDING]
    Pending --> Submit{Employee Submits}
    Submit --> SupervisorPending[SUPERVISOR_PENDING<br/>📋 Manager Review]
    
    SupervisorPending --> SupervisorDecision{Supervisor<br/>Decision}
    SupervisorDecision -->|Approve| AccountingPending[ACCOUNTING_PENDING<br/>💰 Accounting Review]
    SupervisorDecision -->|Reject| Rejected1[REJECTED ❌]
    
    AccountingPending --> AccountingDecision{Accounting<br/>Decision}
    AccountingDecision -->|Reject| Rejected2[REJECTED ❌]
    AccountingDecision -->|Approve & Generate SAP| BusinessLogic{Compare Total vs Prepaid}
    
    BusinessLogic -->|Equal Budget<br/>Total = Prepaid| ApprovedExpenses[APPROVED_EXPENSES ✅<br/>Process Complete]
    BusinessLogic -->|Over Budget<br/>Total > Prepaid| ApprovedForReimbursement[APPROVED_FOR_REIMBURSEMENT<br/>⏩ Needs Treasury]
    BusinessLogic -->|Under Budget<br/>Total < Prepaid| FundsReturnPending[FUNDS_RETURN_PENDING<br/>📎 Employee Action]
    
    FundsReturnPending --> EmployeeSubmitDocs{Employee Submits<br/>Return Documents}
    EmployeeSubmitDocs --> ReviewReturn[REVIEW_RETURN<br/>🏦 Treasury Review]
    
    ApprovedForReimbursement --> TreasuryReimbursement{Treasury<br/>Decision}
    TreasuryReimbursement -->|Approve| ApprovedRepaid[APPROVED_REPAID ✅<br/>Reimbursement Complete]
    TreasuryReimbursement -->|Reject| Rejected3[REJECTED ❌]
    
    ReviewReturn --> TreasuryReturn{Treasury<br/>Decision}
    TreasuryReturn -->|Approve| ApprovedReturnedFunds[APPROVED_RETURNED_FUNDS ✅<br/>Return Complete]
    TreasuryReturn -->|Reject Docs| FundsReturnPending
    
    style Pending fill:#fff3cd,stroke:#856404
    style SupervisorPending fill:#cfe2ff,stroke:#084298
    style AccountingPending fill:#cfe2ff,stroke:#084298
    style ReviewReturn fill:#cfe2ff,stroke:#084298
    style ApprovedForReimbursement fill:#cfe2ff,stroke:#084298
    style FundsReturnPending fill:#fff3cd,stroke:#856404
    style ApprovedExpenses fill:#d1e7dd,stroke:#0f5132
    style ApprovedRepaid fill:#d1e7dd,stroke:#0f5132
    style ApprovedReturnedFunds fill:#d1e7dd,stroke:#0f5132
    style Rejected1 fill:#f8d7da,stroke:#842029
    style Rejected2 fill:#f8d7da,stroke:#842029
    style Rejected3 fill:#f8d7da,stroke:#842029
    style BusinessLogic fill:#e7f3ff,stroke:#004085
```

---

## 🎨 Color Legend

- 🟨 **Yellow** - Employee action required (PENDING, FUNDS_RETURN_PENDING)
- 🟦 **Blue** - Approval stages (SUPERVISOR_PENDING, ACCOUNTING_PENDING, REVIEW_RETURN, APPROVED_FOR_REIMBURSEMENT)
- 🟩 **Green** - Final success states (APPROVED_EXPENSES, APPROVED_REPAID, APPROVED_RETURNED_FUNDS)
- 🟥 **Red** - Rejected states
- 💠 **Light Blue** - Business logic decision point

---

## 📊 Simplified Three-Path View

```mermaid
flowchart LR
    subgraph "Path 1: Equal Budget (Happy Case)"
        A1[PENDING] --> B1[SUPERVISOR_PENDING]
        B1 --> C1[ACCOUNTING_PENDING]
        C1 --> D1[APPROVED_EXPENSES ✅]
    end
    
    subgraph "Path 2: Over Budget (Reimbursement)"
        A2[PENDING] --> B2[SUPERVISOR_PENDING]
        B2 --> C2[ACCOUNTING_PENDING]
        C2 --> D2[APPROVED_FOR_REIMBURSEMENT]
        D2 --> E2[APPROVED_REPAID ✅]
    end
    
    subgraph "Path 3: Under Budget (Fund Return)"
        A3[PENDING] --> B3[SUPERVISOR_PENDING]
        B3 --> C3[ACCOUNTING_PENDING]
        C3 --> D3[FUNDS_RETURN_PENDING]
        D3 --> E3[REVIEW_RETURN]
        E3 --> F3[APPROVED_RETURNED_FUNDS ✅]
    end
    
    style D1 fill:#d1e7dd,stroke:#0f5132
    style E2 fill:#d1e7dd,stroke:#0f5132
    style F3 fill:#d1e7dd,stroke:#0f5132
```

---

## 👥 Approver Roles Diagram

```mermaid
flowchart TD
    subgraph Roles["👥 Approver Roles"]
        direction TB
        Manager[👔 MANAGER<br/>Direct Supervisor]
        Accounting[💰 ACCOUNTING<br/>Finance Team]
        Treasury[🏦 TREASURY<br/>Treasury Team]
        Superuser[⭐ SUPERUSER<br/>System Admin]
    end
    
    subgraph Stages["📋 Approval Stages"]
        direction TB
        Stage1[SUPERVISOR_PENDING]
        Stage2[ACCOUNTING_PENDING]
        Stage3A[APPROVED_FOR_REIMBURSEMENT]
        Stage3B[REVIEW_RETURN]
    end
    
    Manager -->|Can Approve| Stage1
    Accounting -->|Can Approve| Stage2
    Treasury -->|Can Approve| Stage3A
    Treasury -->|Can Approve| Stage3B
    Superuser -->|Can Override All| Stage1
    Superuser -->|Can Override All| Stage2
    Superuser -->|Can Override All| Stage3A
    Superuser -->|Can Override All| Stage3B
    
    style Manager fill:#e3f2fd,stroke:#1976d2
    style Accounting fill:#f3e5f5,stroke:#7b1fa2
    style Treasury fill:#e8f5e9,stroke:#388e3c
    style Superuser fill:#fff3e0,stroke:#f57c00
```

---

## 🔀 Business Logic Decision Tree

```mermaid
flowchart TD
    Start[Accounting Approves Report] --> Calculate[Calculate:<br/>Total Expenses vs<br/>Prepaid Amount]
    Calculate --> Decision{Compare Values}
    
    Decision -->|Total = Prepaid<br/>Equal Budget| Path1[APPROVED_EXPENSES<br/>✅ Skip Treasury<br/>Process Complete]
    Decision -->|Total > Prepaid<br/>Over Budget| Path2[APPROVED_FOR_REIMBURSEMENT<br/>⏩ Treasury Must Pay Difference]
    Decision -->|Total < Prepaid<br/>Under Budget| Path3[FUNDS_RETURN_PENDING<br/>📎 Employee Must Return Excess]
    
    Path2 --> Treasury1[Treasury Approves] --> Final1[APPROVED_REPAID ✅]
    Path3 --> Employee[Employee Submits Docs] --> ReviewDocs[REVIEW_RETURN]
    ReviewDocs --> Treasury2{Treasury Decision}
    Treasury2 -->|Approve| Final2[APPROVED_RETURNED_FUNDS ✅]
    Treasury2 -->|Reject| Path3
    
    style Path1 fill:#d1e7dd,stroke:#0f5132
    style Final1 fill:#d1e7dd,stroke:#0f5132
    style Final2 fill:#d1e7dd,stroke:#0f5132
    style Decision fill:#e7f3ff,stroke:#004085
    style Treasury2 fill:#e7f3ff,stroke:#004085
```

---

## 📈 Status Transition Matrix

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> SUPERVISOR_PENDING: Employee Submits
    SUPERVISOR_PENDING --> ACCOUNTING_PENDING: Supervisor Approves
    SUPERVISOR_PENDING --> REJECTED: Supervisor Rejects
    
    ACCOUNTING_PENDING --> APPROVED_EXPENSES: Approve (Equal Budget)
    ACCOUNTING_PENDING --> APPROVED_FOR_REIMBURSEMENT: Approve (Over Budget)
    ACCOUNTING_PENDING --> FUNDS_RETURN_PENDING: Approve (Under Budget)
    ACCOUNTING_PENDING --> REJECTED: Accounting Rejects
    
    FUNDS_RETURN_PENDING --> REVIEW_RETURN: Employee Submits Docs
    REVIEW_RETURN --> APPROVED_RETURNED_FUNDS: Treasury Approves
    REVIEW_RETURN --> FUNDS_RETURN_PENDING: Treasury Rejects Docs
    
    APPROVED_FOR_REIMBURSEMENT --> APPROVED_REPAID: Treasury Approves
    APPROVED_FOR_REIMBURSEMENT --> REJECTED: Treasury Rejects
    
    APPROVED_EXPENSES --> [*]
    APPROVED_REPAID --> [*]
    APPROVED_RETURNED_FUNDS --> [*]
    REJECTED --> [*]
```

---

## 📊 Timeline View (Typical Flow)

```mermaid
gantt
    title Typical Expense Report Approval Timeline
    dateFormat YYYY-MM-DD
    section Employee
        Create Report           :done, emp1, 2025-01-01, 1d
        Submit for Approval     :done, emp2, 2025-01-02, 1d
        Upload Return Docs      :crit, emp3, 2025-01-07, 1d
    section Supervisor
        Review & Approve        :active, sup1, 2025-01-03, 1d
    section Accounting
        Review Expenses         :acc1, 2025-01-04, 2d
        Generate SAP & Approve  :acc2, 2025-01-06, 1d
    section Treasury
        Review Return Docs      :tres1, 2025-01-08, 1d
        Final Approval          :tres2, 2025-01-09, 1d
```

---

## 🎯 Quick Reference: All 12 Statuses

| Status | Type | Description | Who Acts |
|--------|------|-------------|----------|
| **PENDING** | 🟨 Employee | Initial state after creation | Employee submits |
| **SUPERVISOR_PENDING** | 🟦 Workflow | Awaiting manager approval | Manager |
| **ACCOUNTING_PENDING** | 🟦 Workflow | Awaiting accounting review | Accounting |
| **APPROVED_EXPENSES** | 🟩 Final | Approved, equal budget | - |
| **APPROVED_FOR_REIMBURSEMENT** | 🟦 Workflow | Needs treasury payment | Treasury |
| **FUNDS_RETURN_PENDING** | 🟨 Employee | Employee must upload docs | Employee |
| **REVIEW_RETURN** | 🟦 Workflow | Treasury reviewing return docs | Treasury |
| **APPROVED_REPAID** | 🟩 Final | Reimbursement complete | - |
| **APPROVED_RETURNED_FUNDS** | 🟩 Final | Fund return complete | - |
| **REJECTED** | 🟥 Final | Report rejected | - |

---

## 🔗 Integration Points

```mermaid
flowchart LR
    subgraph Frontend["🖥️ Frontend"]
        UI[User Interface]
        Forms[Approval Forms]
    end
    
    subgraph Backend["⚙️ Backend API"]
        Routes[/api/approvals/*]
        Logic[Business Logic]
        SAP[SAP File Generator]
    end
    
    subgraph Database["🗄️ Database"]
        Reports[(Reports Table)]
        History[(Approval History)]
    end
    
    subgraph External["🔌 External"]
        Email[📧 Email Service<br/>Async Notifications]
        SAPSystem[SAP System<br/>File Import]
    end
    
    UI --> Routes
    Forms --> Routes
    Routes --> Logic
    Logic --> Reports
    Logic --> History
    Logic --> SAP
    SAP --> SAPSystem
    Logic --> Email
```

---

## 📝 How to Use This Flowchart

### **Option 1: GitHub/GitLab**
1. Copy this entire file to your repository
2. Mermaid diagrams render automatically in `.md` files
3. Share the GitHub link with your team

### **Option 2: Mermaid Live Editor**
1. Go to https://mermaid.live
2. Copy any diagram code block
3. Paste into the editor
4. Export as PNG/SVG/PDF

### **Option 3: Notion/Confluence**
1. Create a code block
2. Set language to `mermaid`
3. Paste the diagram code
4. It will render automatically

### **Option 4: Export as Image**
```bash
# Using mermaid-cli (install: npm install -g @mermaid-js/mermaid-cli)
mmdc -i docs/REPORTS_APPROVAL_FLOWCHART_VISUAL.md -o reports-flow.png
```

---

## 🔍 Key Decision Points Summary

1. **After Supervisor Approval** → Always goes to Accounting
2. **After Accounting Approval** → Business logic determines path:
   - Equal → Final approval ✅
   - Over → Treasury (reimbursement)
   - Under → Employee (return docs) → Treasury
3. **Treasury Fund Return Rejection** → Loops back to employee (unique!)
4. **Any Stage Rejection** → Terminal REJECTED state

---

**Last Updated**: September 30, 2025  
**System**: Viaticos 2025 v1.0  
**Environment**: https://amcor-viaticos2025.tech-labs.org

---

## 📥 Download Links

- [Text Version](REPORTS_APPROVAL_FLOWCHART.md) - Complete documentation
- [Visual Version](REPORTS_APPROVAL_FLOWCHART_VISUAL.md) - This file (Mermaid diagrams)
