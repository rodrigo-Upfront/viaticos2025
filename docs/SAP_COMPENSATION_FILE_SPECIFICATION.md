# SAP Compensation File Specification

## Overview
The SAP Compensation file is generated after all expenses in a report have been approved by accounting. It reconciles the prepayment amount with actual expenses and determines if the employee needs to return funds or receive reimbursement.

## File Details
- **File Name Format**: `expense-report-{report_id}-compensation-sap.txt`
- **File Type**: Plain text (`.txt`)
- **Encoding**: UTF-8
- **Field Separator**: Semicolon (`;`)
- **Line Format**: One line per approved expense
- **Total Fields**: 18 fields per line

## Compensation Logic

The compensation logic determines how to reconcile the prepayment (if any) with the total approved expenses. This affects **Field 2** (Tipo de Compensación), **Field 17** (Importe a devolver), and **Field 18** (Proveedor a devolver).

### Calculation Steps:
1. **Calculate total_expenses**: Sum of all approved expense amounts
2. **Get prepayment_amount**: Prepayment amount (or 0 if no prepayment)
3. **Compare amounts**: Determine which scenario applies
4. **Set compensation fields**: Based on the comparison result

### Scenario 1: No Prepayment (prepayment_amount = 0)
**When**: Report created without prepayment (direct expense report)

- **Field 2 - Subtype**: `Gastos Aprobados`
- **Field 17 - Amount to Return**: `0` (empty string)
- **Field 18 - Provider**: Empty string
- **Business Meaning**: Employee paid out-of-pocket and will be reimbursed the full amount through normal expense processing

**Example**:
- Prepayment: $0
- Total Expenses: $500
- Result: Employee receives $500 reimbursement (handled by SAP expense processing, not by compensation file)

### Scenario 2: Prepayment > Total Expenses (Employee owes money back)
**When**: Employee received advance but spent less than the advance

- **Field 2 - Subtype**: `Pendiente de Devolución` (Pending Return)
- **Field 17 - Amount to Return**: `prepayment_amount - total_expenses` (formatted as integer, no decimals)
- **Field 18 - Provider**: User's SAP code (the employee who must return money)
- **Business Meaning**: Employee must return the difference to the company

**Example**:
- Prepayment: $1,000
- Total Expenses: $650
- Amount to Return: $350
- Field 17: `350`
- Field 18: `EMP001` (employee's SAP code)
- Result: Employee owes company $350

### Scenario 3: Prepayment < Total Expenses (Company owes employee)
**When**: Employee received advance but spent more than the advance

- **Field 2 - Subtype**: `Aprobado para Reembolso` (Approved for Reimbursement)
- **Field 17 - Amount to Return**: `total_expenses - prepayment_amount` (formatted as integer, no decimals)
- **Field 18 - Provider**: User's SAP code (the employee who should receive reimbursement)
- **Business Meaning**: Company must reimburse the employee for the difference

**Example**:
- Prepayment: $500
- Total Expenses: $850
- Amount to Return: $350
- Field 17: `350`
- Field 18: `EMP001` (employee's SAP code)
- Result: Company owes employee $350

### Scenario 4: Prepayment = Total Expenses (Exact match)
**When**: Employee spent exactly the advance amount

- **Field 2 - Subtype**: `Gastos Aprobados` (Approved Expenses)
- **Field 17 - Amount to Return**: `0` (empty string)
- **Field 18 - Provider**: Empty string
- **Business Meaning**: Transaction is balanced, no money needs to change hands

**Example**:
- Prepayment: $750
- Total Expenses: $750
- Amount to Return: $0
- Field 17: Empty
- Field 18: Empty
- Result: Account is settled, no further action needed

## Field Structure (18 Fields)

### Fields 1-3: Basic Compensation Info (All Expenses)
| Field | Name | Description | Source | Example |
|-------|------|-------------|--------|---------|
| 1 | Tipo | Compensation type | Always "COMPENSACION" | `COMPENSACION` |
| 2 | Tipo de Compensación | Compensation subtype | Calculated based on amounts | `Pendiente de Devolución` |
| 3 | Sociedad | Company/Location SAP code | `user.location.sap_code` | `1000` |

### Fields 4-6: Prepayment Info (Only if prepayment exists)
| Field | Name | Description | Source | Example |
|-------|------|-------------|--------|---------|
| 4 | No Partida SAP Anticipo | SAP prepayment record number | `prepayment.sap_record_number` | `5000123456` |
| 5 | Nombre Anticipo | Prepayment name with report ID | `{report.id}-{prepayment.reason}` | `42-Business trip` |
| 6 | Indicador de Anticipo | Prepayment indicator | "ANTICIPO" if prepayment exists | `ANTICIPO` |

**Note**: If no prepayment exists, fields 4-6 are empty.

### Fields 7-9: FACTURA-Specific Fields (Only for FACTURA expenses)
| Field | Name | Description | Source | Example |
|-------|------|-------------|--------|---------|
| 7 | No Partida SAP Factura | SAP invoice number | `expense.sap_invoice_number` | `3000456789` |
| 8 | Nombre Factura | Invoice name with report ID | `{report.id}-{report_reason}` | `42-Business trip` |
| 9 | Indicador de Factura | Invoice indicator | "FACTURA" for invoice expenses | `FACTURA` |

**Note**: For BOLETA expenses, fields 7-9 are empty.

### Fields 10-12: BOLETA-Specific Fields (Only for BOLETA expenses)
| Field | Name | Description | Source | Example |
|-------|------|-------------|--------|---------|
| 10 | Clave del Gasto | Expense key | Always "40" for receipts | `40` |
| 11 | Cuenta mayor | General ledger account | `expense.category.account` | `5710110000` |
| 12 | Identificador de Viaje | Trip identifier with report ID | `{report.id}-{report_reason}` | `42-Business trip` |

**Note**: For FACTURA expenses, fields 10-12 are empty.

### Fields 13-16: BOLETA Amount Details (Only for BOLETA expenses)
| Field | Name | Description | Calculation | Example |
|-------|------|-------------|-------------|---------|
| 13 | Importe | Net amount (without tax) | `expense_amount - tax_amount` | `150.00` |
| 14 | Indicador de Impuesto | Tax indicator | Always "C0" for receipts | `C0` |
| 15 | Centro de Costo | Cost center | `user.cost_center` | `CC001` |
| 16 | Detalle de Gasto | Expense description | `expense.purpose` | `Hotel accommodation` |

**Note**: For FACTURA expenses, fields 13-16 are empty.

**Tax Calculation** (for taxable BOLETA expenses):
```python
if expense.taxable == "SI" and expense.tax.rate:
    tax_amount = expense_amount * (tax_rate / (100 + tax_rate))
    net_amount = expense_amount - tax_amount
else:
    net_amount = expense_amount
```

### Fields 17-18: Compensation Return Fields (All Expenses)
| Field | Name | Description | Logic | Example |
|-------|------|-------------|-------|---------|
| 17 | Importe a devolver | Amount to return | Based on compensation subtype | `500` |
| 18 | Proveedor a devolver | Provider to return | Empty if "Gastos Aprobados", else `user.sap_code` | `EMP001` |

**Field 17 Logic**:
- If `amount_to_return > 0`: Format as integer (no decimals)
- Otherwise: Empty string

**Field 18 Logic**:
- If `compensation_subtype == "Gastos Aprobados"`: Empty
- Otherwise: User's SAP code

## Expense Ordering
Expenses are sorted by document type:
1. **FACTURA** (Invoices) first
2. **BOLETA** (Receipts) second

Within each type, expenses maintain their original order.

## Report Reason Priority
The `report_reason` is determined in this order:
1. `report.reason` (if exists)
2. `report.prepayment.reason` (if report.reason is null and prepayment exists)
3. `f"Expense Report {report.id}"` (fallback)

## Example File Content

### Example 1: Report with Prepayment and Mixed Expenses
```
COMPENSACION;Pendiente de Devolución;1000;5000123456;42-Business trip to Mexico;ANTICIPO;3000456789;42-Business trip to Mexico;FACTURA;;;;;;500;EMP001
COMPENSACION;Pendiente de Devolución;1000;5000123456;42-Business trip to Mexico;ANTICIPO;;;40;5710110000;42-Business trip to Mexico;150.00;C0;CC001;Hotel stay;500;EMP001
COMPENSACION;Pendiente de Devolución;1000;5000123456;42-Business trip to Mexico;ANTICIPO;;;40;5710110000;42-Business trip to Mexico;85.00;C0;CC001;Taxi to airport;500;EMP001
```

### Example 2: Report without Prepayment (BOLETA only)
```
COMPENSACION;Gastos Aprobados;1000;;;;;40;5710110000;42-Conference attendance;200.00;C0;CC001;Conference registration;;
COMPENSACION;Gastos Aprobados;1000;;;;;40;5710110000;42-Conference attendance;50.00;C0;CC001;Meals;;
```

### Example 3: Report with Reimbursement Due
```
COMPENSACION;Aprobado para Reembolso;1000;5000123456;42-Client meeting;ANTICIPO;3000456789;42-Client meeting;FACTURA;;;;;;350;EMP001
COMPENSACION;Aprobado para Reembolso;1000;5000123456;42-Client meeting;ANTICIPO;;;40;5710110000;42-Client meeting;120.00;C0;CC001;Parking;350;EMP001
```

## Important Notes

1. **Empty Fields**: All empty fields must still be present with semicolon separators
2. **One Expense Per Line**: Each approved expense generates exactly one line
3. **Consistent Compensation Info**: Fields 1-6, 17, and 18 are the same for all expenses in the report
4. **Mutually Exclusive Sections**:
   - FACTURA expenses: Fields 7-9 populated, 10-16 empty
   - BOLETA expenses: Fields 10-16 populated, 7-9 empty
5. **Amount Formatting**:
   - Field 13 (BOLETA amount): 2 decimal places (`150.00`)
   - Field 17 (Amount to return): No decimals (`500`)
6. **Report ID**: Now included in fields 5, 8, and 12 in format `{report.id}-{reason}`

## Generation Trigger
This file is generated when:
- All expenses in the report have been approved by accounting
- The report status transitions to final accounting approval
- User clicks "Generate SAP Compensation File" in the UI

## Storage Location
- **Development**: `/app/storage/uploads/sap_files/expense_reports/`
- **Production**: Same path within Docker container
- **Database**: Relative path stored as `sap_files/expense_reports/expense-report-{id}-compensation-sap.txt`

## Related Files
- **Prepayment SAP File**: Generated when treasury approves prepayment
- **Expenses SAP File**: Generated when accounting approves expense report (FACTURA expenses only)
- **Compensation SAP File**: This file (all approved expenses with compensation logic)

## API Endpoint
- **Method**: POST
- **Path**: `/api/reports/{report_id}/generate-compensation-file`
- **Authentication**: Required (Accounting or Treasury role)
- **Response**: Returns file path and confirmation message

---

## Detailed Field Analysis: Fields 2, 17, and 18

These three fields work together to communicate the compensation outcome to SAP.

### Field 2: Tipo de Compensación (Compensation Subtype)

**Purpose**: Tells SAP what type of financial reconciliation is needed.

**Data Type**: String (Spanish text)

**Possible Values**:
1. `Gastos Aprobados` - "Approved Expenses"
2. `Pendiente de Devolución` - "Pending Return"
3. `Aprobado para Reembolso` - "Approved for Reimbursement"

**Decision Logic**:
```python
if prepayment_amount == 0:
    compensation_subtype = "Gastos Aprobados"
elif prepayment_amount > total_expenses:
    compensation_subtype = "Pendiente de Devolución"
elif prepayment_amount < total_expenses:
    compensation_subtype = "Aprobado para Reembolso"
else:  # prepayment_amount == total_expenses
    compensation_subtype = "Gastos Aprobados"
```

**Important Notes**:
- This field appears **on every line** (repeated for each expense)
- The value is **the same for all expenses** in the report
- SAP uses this field to route the compensation transaction to the correct workflow
- "Gastos Aprobados" can mean two different things:
  - No prepayment exists (employee gets normal reimbursement)
  - Amounts match exactly (no additional payment needed)

**SAP Processing**:
- `Gastos Aprobados`: No special compensation processing, standard expense reimbursement
- `Pendiente de Devolución`: Creates a receivable transaction (employee owes company)
- `Aprobado para Reembolso`: Creates an additional payable transaction (company owes employee)

---

### Field 17: Importe a devolver (Amount to Return)

**Purpose**: The monetary amount that needs to be returned or reimbursed.

**Data Type**: String (integer format, no decimals)

**Possible Values**:
- Empty string (when no compensation is needed)
- Positive integer (e.g., `350`, `1250`, `50`)

**Calculation Logic**:
```python
if prepayment_amount == 0:
    amount_to_return = 0.0  # Empty string in file
elif prepayment_amount > total_expenses:
    amount_to_return = prepayment_amount - total_expenses
elif prepayment_amount < total_expenses:
    amount_to_return = total_expenses - prepayment_amount
else:  # Equal amounts
    amount_to_return = 0.0  # Empty string in file
```

**Formatting Rules**:
```python
# In the code:
if amount_to_return > 0:
    field_17 = f"{amount_to_return:.0f}"  # Format as integer (no decimals)
else:
    field_17 = ""  # Empty string
```

**Important Notes**:
- This field appears **on every line** (repeated for each expense)
- The value is **the same for all expenses** in the report
- **Direction is neutral**: The actual direction (company→employee or employee→company) is determined by Field 2
- **Format**: Integer only (cents are dropped, not rounded)
  - Example: $350.75 becomes `350`
  - Example: $1,250.99 becomes `1250`
- **Currency**: Not specified in the file; SAP determines currency from other fields

**Examples**:
| Prepayment | Expenses | Field 2 | Field 17 | Meaning |
|------------|----------|---------|----------|---------|
| $1,000 | $650 | Pendiente de Devolución | `350` | Employee returns $350 |
| $500 | $850 | Aprobado para Reembolso | `350` | Company pays employee $350 |
| $750 | $750 | Gastos Aprobados | (empty) | No compensation needed |
| $0 | $500 | Gastos Aprobados | (empty) | Normal reimbursement |

**SAP Processing**:
- SAP creates a financial transaction for this amount
- The transaction type is determined by Field 2
- The beneficiary/debtor is determined by Field 18

---

### Field 18: Proveedor a devolver (Provider to Return)

**Purpose**: Identifies who should pay or receive the compensation amount.

**Data Type**: String (SAP employee code)

**Possible Values**:
- Empty string (when no compensation is needed)
- Employee SAP code (e.g., `EMP001`, `12345`, `JDOE`)

**Decision Logic**:
```python
if compensation_subtype == "Gastos Aprobados":
    provider_to_return = ""  # Empty string
else:
    provider_to_return = user.sap_code or ""  # Employee's SAP code
```

**Important Notes**:
- This field appears **on every line** (repeated for each expense)
- The value is **the same for all expenses** in the report
- This is the **employee's** SAP code (from `users.sap_code`), not a supplier code
- Empty when Field 2 = "Gastos Aprobados" (regardless of amount)
- Populated when Field 2 = "Pendiente de Devolución" or "Aprobado para Reembolso"

**Interpretation Table**:
| Field 2 | Field 17 | Field 18 | Interpretation |
|---------|----------|----------|----------------|
| Gastos Aprobados | (empty) | (empty) | No compensation transaction needed |
| Pendiente de Devolución | `350` | `EMP001` | Employee EMP001 must pay $350 to company |
| Aprobado para Reembolso | `500` | `EMP001` | Company must pay $500 to employee EMP001 |

**Why This Field Can Be Empty**:
1. **"Gastos Aprobados" + No Prepayment**: Employee will get reimbursed through normal expense processing (not compensation)
2. **"Gastos Aprobados" + Exact Match**: No money needs to change hands, account is settled

**SAP Processing**:
- When populated: SAP creates a transaction between the company and this employee code
- The direction (debit/credit) is determined by Field 2
- When empty: SAP handles reimbursement through standard expense workflow (not compensation)

---

### How These Three Fields Work Together

**Example 1: Employee Owes Money**
```
Prepayment: $1,000
Total Expenses: $650
Difference: $350

Field 2:  "Pendiente de Devolución"  → Employee must return money
Field 17: "350"                       → Amount is $350
Field 18: "EMP001"                    → Employee EMP001 must pay

SAP Action: Create receivable transaction (debit) against employee EMP001 for $350
```

**Example 2: Company Owes Money**
```
Prepayment: $500
Total Expenses: $850
Difference: $350

Field 2:  "Aprobado para Reembolso"  → Company must reimburse employee
Field 17: "350"                       → Amount is $350
Field 18: "EMP001"                    → Pay employee EMP001

SAP Action: Create payable transaction (credit) to employee EMP001 for $350
```

**Example 3: Balanced (Exact Match)**
```
Prepayment: $750
Total Expenses: $750
Difference: $0

Field 2:  "Gastos Aprobados"         → No compensation needed
Field 17: ""                          → No amount to transfer
Field 18: ""                          → No party identified

SAP Action: Mark report as closed, no additional transactions
```

**Example 4: No Prepayment**
```
Prepayment: $0
Total Expenses: $500
Difference: N/A

Field 2:  "Gastos Aprobados"         → Normal expense processing
Field 17: ""                          → (Compensation amount is zero)
Field 18: ""                          → (Handled by expense workflow)

SAP Action: Process $500 through standard expense reimbursement (not compensation workflow)
```

---

### Common Questions

**Q: Why is Field 18 empty when Field 2 is "Gastos Aprobados"?**
A: Because "Gastos Aprobados" means no compensation transaction is needed. Either there's no prepayment (standard expense reimbursement applies) or the amounts match exactly (account is settled).

**Q: What if the employee doesn't have a SAP code?**
A: The code will use an empty string for Field 18. However, this should be prevented at the validation level - employees creating expense reports should have a SAP code assigned.

**Q: Can Field 17 ever be negative?**
A: No. The amount is always calculated as an absolute difference and formatted as a positive integer. The direction (who owes whom) is indicated by Field 2, not by a negative sign.

**Q: Why is Field 17 an integer and not a decimal?**
A: This is the SAP integration requirement. The amount is formatted as `{amount:.0f}` which truncates (not rounds) the decimal portion. If precise cent-level tracking is needed, this should be handled separately.

**Q: What happens if Field 2 says "Aprobado para Reembolso" but Field 18 is empty?**
A: This would be an error condition. The code should prevent this by always setting Field 18 when Field 2 is not "Gastos Aprobados". If this occurs, SAP would likely reject the file or create an error transaction.

