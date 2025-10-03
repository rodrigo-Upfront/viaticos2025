# 📄 Complete SAP Files Specification

## Overview
The Viaticos 2025 system generates **three types of SAP files** for integration with the SAP financial system:

1. **Prepayment SAP File** - Treasury approval (anticipo)
2. **Expenses SAP File** - Accounting approval (facturas)
3. **Compensation SAP File** - Accounting approval (compensación)

**Last Updated**: October 1, 2025  
**Version**: 1.0.2

---

## 🎯 **Summary of Report ID Usage**

### **Files That Include Report ID**:
| File | Field | Current Format | Needs Update? |
|------|-------|----------------|---------------|
| **Prepayment SAP** | Field 6 (HEADER_TXT) | ✅ `{report_id}-{reason}` | ✅ **DONE** |
| **Expenses SAP** | Field 6 (HEADER_TXT) | ❌ `{reason}` | ⚠️ **TO DO** |
| **Compensation SAP** | Field 5 (Nombre Anticipo) | ❌ `{prepayment.reason}` | ⚠️ **TO DO** |
| **Compensation SAP** | Field 8 (Nombre Factura) | ❌ `{report_reason}` | ⚠️ **TO DO** |

---

## 📋 **1. Prepayment SAP File** ✅ UPDATED

### **When Generated**:
- Treasury approval - Step 1 (Deposit Number entry)
- Endpoint: `POST /api/approvals/prepayments/{id}/treasury/deposit`

### **File Format**:
- **Delimiter**: Semicolon (`;`)
- **Lines**: 1 line
- **Fields**: 18 fields
- **Encoding**: UTF-8

### **File Naming**:
```
prepayment-{prepayment_id}-sap.txt
```

### **Field Structure** (18 Fields):

| # | Field Name | Description | Example | Source |
|---|------------|-------------|---------|--------|
| 1 | COMP_CODE | Company/Location SAP Code | `PE11` | `location.sap_code` |
| 2 | DOC_DATE | Document Date | `01.10.2025` | Current date |
| 3 | PSTNG_DATE | Posting Date | `01.10.2025` | Current date |
| 4 | REF_DOC_NO | Deposit Number | `123123` | Treasury input |
| 5 | ITEMNO_ACC | Item Number | `0000000001` | Static |
| 6 | **HEADER_TXT** | **Header Text** | **`120-Business trip`** | **`{report_id}-{prepayment.reason}`** ✅ |
| 7 | VENDOR_NO | Employee SAP Code | `10243` | `user.sap_code` |
| 8 | PROFIT_CTR | Cost Center | `24010100` | `location.cost_center` |
| 9 | CURRENCY | Currency Code | `USD` | `currency.code` |
| 10 | AMT_DOCCUR | Amount (negative) | `-500` | `-{amount}` |
| 11 | GL_ACCOUNT | General Ledger Account | `110104712` | `location_currency.account` |
| 12 | ITEM_TEXT | Item Text | `Business trip` | `prepayment.reason` |
| 13 | COSTCENTER | Cost Center | *(empty)* | Empty |
| 14 | ALLOC_NMBR | Allocation Number | *(empty)* | Empty |
| 15 | VALUE_DATE | Value Date | `01.10.2025` | Current date |
| 16 | AMT_DOCCUR | Amount (duplicate) | *(empty)* | Empty |
| 17 | TAX_CODE | Tax Code | *(empty)* | Empty |
| 18 | MOVIMIENTO | Movement Type | `ANTICIPO` | Static |

### **Example**:
```
PE11;01.10.2025;01.10.2025;123123;0000000001;120-Business trip to New York;10243;24010100;USD;-500;110104712;Business trip to New York;;;01.10.2025;;;ANTICIPO
```

**✅ Field 6 NOW includes report_id**: `120-Business trip to New York`

---

## 📋 **2. Expenses SAP File** ⚠️ NEEDS UPDATE

### **When Generated**:
- Accounting approval - Step 1 (Generate Expenses File)
- Endpoint: `POST /api/reports/{report_id}/accounting/expenses-file`
- **Only includes FACTURA expenses**

### **File Format**:
- **Delimiter**: Semicolon (`;`)
- **Lines**: One line per FACTURA expense
- **Fields**: 18 fields per line
- **Encoding**: UTF-8

### **File Naming**:
```
expense-report-{report_id}-expenses-sap.txt
```

### **Field Structure** (18 Fields per Expense):

| # | Field Name | Description | Example | Source |
|---|------------|-------------|---------|--------|
| 1 | COMP_CODE | Company/Location SAP Code | `PE11` | `location.sap_code` |
| 2 | DOC_DATE | Processing Date | `01.10.2025` | Current date |
| 3 | PSTNG_DATE | Posting Date | `01.10.2025` | Current date |
| 4 | REF_DOC_NO | Document Number | `XX-12345-1234567` | `expense.document_number` |
| 5 | ITEMNO_ACC | Item Number | `0000000001` | Static |
| 6 | **HEADER_TXT** | **Header Text** | **`Business trip`** | **`report_reason`** ❌ **NEEDS report_id** |
| 7 | SUPPLIER_SAP_CODE | Supplier SAP Code | `SUP001` | `factura_supplier.sap_code` |
| 8 | PROFIT_CTR | Profit Center | *(empty)* | Empty |
| 9 | CURRENCY | Currency Code | `USD` | `expense.currency.code` |
| 10 | AMT_DOCCUR | Amount (negative, full) | `-150.00` | `-{expense.amount}` |
| 11 | GL_ACCOUNT | Category Account | `123456` | `category.account` |
| 12 | ITEM_TEXT | Expense Purpose | `Hotel stay` | `expense.purpose` |
| 13 | COSTCENTER | User Cost Center | `ADMIN` | `user.cost_center` |
| 14 | ALLOC_NMBR | Document Number (repeat) | `XX-12345-1234567` | `expense.document_number` |
| 15 | VALUE_DATE | Expense Date | `28.09.2025` | `expense.expense_date` |
| 16 | AMT_DOCCUR_TAX | Net Amount (if taxable) | `130.43` | `expense.amount - tax` |
| 17 | TAX_CODE | Tax Code | `IGV18` | `tax.code` |
| 18 | MOVIMIENTO | Movement Type | `FACTURA` | Static |

### **Current Code** (Line 260):
```python
report_reason,  # HEADER_TXT
```

### **Needs to be Changed To**:
```python
f"{report.id}-{report_reason}",  # HEADER_TXT with report ID
```

### **Example** (Multi-line, one per FACTURA expense):
```
PE11;01.10.2025;01.10.2025;XX-12345-1234567;0000000001;120-Business trip;SUP001;;USD;-150.00;123456;Hotel stay;ADMIN;XX-12345-1234567;28.09.2025;130.43;IGV18;FACTURA
PE11;01.10.2025;01.10.2025;YY-67890-7654321;0000000001;120-Business trip;SUP002;;USD;-80.00;654321;Flight ticket;ADMIN;YY-67890-7654321;29.09.2025;69.57;IGV18;FACTURA
```

**❌ Field 6 should be**: `120-Business trip` (not just `Business trip`)

---

## 📋 **3. Compensation SAP File** ⚠️ NEEDS UPDATE

### **When Generated**:
- Accounting approval - Step 2 (Generate Compensation File)
- Endpoint: `POST /api/reports/{report_id}/accounting/invoice-numbers`
- **Includes ALL approved expenses** (FACTURA + BOLETA)

### **File Format**:
- **Delimiter**: Semicolon (`;`)
- **Lines**: One line per expense
- **Fields**: 18 fields per line
- **Encoding**: UTF-8
- **Order**: FACTURA first, then BOLETA

### **File Naming**:
```
expense-report-{report_id}-compensation-sap.txt
```

### **Field Structure** (18 Fields per Expense):

| # | Field Name | Description | Example | Source |
|---|------------|-------------|---------|--------|
| 1 | Tipo | Compensation Type | `COMPENSACION` | Logic-based |
| 2 | Tipo de Compensación | Compensation Subtype | `Gastos Aprobados` | Logic-based |
| 3 | Sociedad | Company SAP Code | `PE11` | `location.sap_code` |
| 4 | No Partida SAP Anticipo | Prepayment SAP Record | `SAP-12345` | `prepayment.sap_record_number` |
| 5 | **Nombre Anticipo** | **Prepayment Name** | **`Business trip`** | **`prepayment.reason`** ❌ **NEEDS report_id** |
| 6 | Indicador de Anticipo | Prepayment Indicator | `ANTICIPO` | Static (if prepayment) |
| 7 | No Partida SAP Factura | Invoice SAP Number | `INV-123` | `expense.sap_invoice_number` (FACTURA only) |
| 8 | **Nombre Factura** | **Invoice Name** | **`Business trip`** | **`report_reason`** ❌ **NEEDS report_id** |
| 9 | Indicador de Factura | Invoice Indicator | `FACTURA` | `FACTURA` or empty |
| 10 | Clave del Gasto | Expense Key | `40` | `40` (BOLETA) or empty |
| 11 | Nombre Boleta | Receipt Name | `Business trip` | `report_reason` (BOLETA) or empty |
| 12 | Indicador de Boleta | Receipt Indicator | `BOLETA` | `BOLETA` or empty |
| 13 | Cuenta Contable | GL Account | `123456` | `category.account` |
| 14 | Centro de Costo | Cost Center | `ADMIN` | `user.cost_center` |
| 15 | Nombre Gasto | Expense Name | `Hotel stay` | `expense.purpose` |
| 16 | Importe Neto | Net Amount | `130.43` | `expense.amount - tax` |
| 17 | Proveedor Devolver | Provider to Return | *(empty)* | `user.sap_code` (conditional) |
| 18 | Importe Devolver | Amount to Return | *(empty)* | Calculated amount |

### **Current Code** (Lines 394, 399, 407):
```python
# Line 394-395
report.prepayment.reason or "" if report.prepayment else "",  # 5. Nombre Anticipo

# Line 399
report_reason if expense.document_type == DocumentType.FACTURA else "",  # 8. Nombre Factura

# Line 407
report_reason if expense.document_type == DocumentType.BOLETA else "",  # 11. Nombre Boleta
```

### **Needs to be Changed To**:
```python
# Line 394-395 - Prepayment name with report_id
f"{report.id}-{report.prepayment.reason}" if report.prepayment and report.prepayment.reason else (f"{report.id}-{report.reason}" if report.reason else f"Report {report.id}"),

# Line 399 - FACTURA name with report_id
f"{report.id}-{report_reason}" if expense.document_type == DocumentType.FACTURA else "",

# Line 407 - BOLETA name with report_id
f"{report.id}-{report_reason}" if expense.document_type == DocumentType.BOLETA else "",
```

### **Example** (Multi-line, FACTURA then BOLETA):
```
COMPENSACION;Gastos Aprobados;PE11;SAP-12345;120-Business trip to NY;ANTICIPO;INV-123;120-Business trip to NY;FACTURA;;;;123456;ADMIN;Hotel stay;130.43;;
COMPENSACION;Gastos Aprobados;PE11;SAP-12345;120-Business trip to NY;ANTICIPO;;;40;120-Business trip to NY;BOLETA;654321;ADMIN;Taxi fare;25.00;;
```

**❌ Fields 5, 8, and 11 should include**: `120-Business trip to NY` (not just `Business trip to NY`)

---

## 🔄 **Report ID Logic Summary**

### **Where report_id Comes From**:
```python
# For Prepayment SAP File
prepayment.report_id  # Reserved during SAP file generation

# For Expenses & Compensation SAP Files
report.id  # The TravelExpenseReport ID (matches prepayment.report_id if from prepayment)
```

### **How They Match**:
1. **Prepayment approved** → Creates report with `id = prepayment.report_id`
2. **Prepayment SAP file** Field 6: `{report_id}-{reason}`
3. **Expenses SAP file** Field 6: `{report.id}-{reason}` ← **Same ID!**
4. **Compensation SAP file** Fields 5, 8, 11: `{report.id}-{reason}` ← **Same ID!**

**Result**: All three files reference the **same report ID** ✅

---

## 🛠️ **Required Code Changes**

### **File**: `backend/app/services/sap_service.py`

### **Change 1: Expenses File (Line ~260)**

**Before**:
```python
fields = [
    location.sap_code,                    # COMP_CODE
    processing_date,                      # DOC_DATE
    processing_date,                      # PSTNG_DATE
    expense.document_number,              # REF_DOC_NO
    "0000000001",                        # ITEMNO_ACC
    report_reason,                       # HEADER_TXT  ← CHANGE THIS
    expense.factura_supplier.sap_code,   # SUPPLIER_SAP_CODE
```

**After**:
```python
fields = [
    location.sap_code,                    # COMP_CODE
    processing_date,                      # DOC_DATE
    processing_date,                      # PSTNG_DATE
    expense.document_number,              # REF_DOC_NO
    "0000000001",                        # ITEMNO_ACC
    f"{report.id}-{report_reason}",      # HEADER_TXT (with report ID)
    expense.factura_supplier.sap_code,   # SUPPLIER_SAP_CODE
```

### **Change 2: Compensation File (Lines ~394, ~399, ~407)**

**Before**:
```python
fields = [
    # Fields 1-3: Basic compensation info
    compensation_type,                        # 1. Tipo
    compensation_subtype,                     # 2. Tipo de Compensación
    user.location.sap_code,                  # 3. Sociedad
    
    # Fields 4-6: Prepayment info
    report.prepayment.sap_record_number or "" if report.prepayment else "",  # 4
    report.prepayment.reason or "" if report.prepayment else "",             # 5 ← CHANGE THIS
    "ANTICIPO" if report.prepayment else "",                                 # 6
    
    # Fields 7-9: FACTURA-specific fields
    expense.sap_invoice_number or "" if expense.document_type == DocumentType.FACTURA else "",  # 7
    report_reason if expense.document_type == DocumentType.FACTURA else "",  # 8 ← CHANGE THIS
    "FACTURA" if expense.document_type == DocumentType.FACTURA else "",      # 9
    
    # Fields 10-12: BOLETA-specific fields
    "40" if expense.document_type == DocumentType.BOLETA else "",            # 10
    report_reason if expense.document_type == DocumentType.BOLETA else "",   # 11 ← CHANGE THIS
    "BOLETA" if expense.document_type == DocumentType.BOLETA else "",        # 12
```

**After**:
```python
# Calculate report_reason with ID
report_reason_with_id = f"{report.id}-{report_reason}"
prepayment_reason_with_id = ""
if report.prepayment and report.prepayment.reason:
    prepayment_reason_with_id = f"{report.id}-{report.prepayment.reason}"
elif report.reason:
    prepayment_reason_with_id = f"{report.id}-{report.reason}"
else:
    prepayment_reason_with_id = f"Report {report.id}"

fields = [
    # Fields 1-3: Basic compensation info
    compensation_type,                        # 1. Tipo
    compensation_subtype,                     # 2. Tipo de Compensación
    user.location.sap_code,                  # 3. Sociedad
    
    # Fields 4-6: Prepayment info
    report.prepayment.sap_record_number or "" if report.prepayment else "",  # 4
    prepayment_reason_with_id if report.prepayment else "",                  # 5 (with report ID)
    "ANTICIPO" if report.prepayment else "",                                 # 6
    
    # Fields 7-9: FACTURA-specific fields
    expense.sap_invoice_number or "" if expense.document_type == DocumentType.FACTURA else "",  # 7
    report_reason_with_id if expense.document_type == DocumentType.FACTURA else "",  # 8 (with report ID)
    "FACTURA" if expense.document_type == DocumentType.FACTURA else "",      # 9
    
    # Fields 10-12: BOLETA-specific fields
    "40" if expense.document_type == DocumentType.BOLETA else "",            # 10
    report_reason_with_id if expense.document_type == DocumentType.BOLETA else "",   # 11 (with report ID)
    "BOLETA" if expense.document_type == DocumentType.BOLETA else "",        # 12
```

---

## 📊 **Before and After Examples**

### **Before Changes**:

**Prepayment SAP**:
```
...;ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

**Expenses SAP**:
```
...;ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

**Compensation SAP**:
```
COMPENSACION;...;ANTICIPO COMPLETO EJEMPLO REPORTE 01;...;ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

### **After Changes**:

**Prepayment SAP**:
```
...;120-ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

**Expenses SAP**:
```
...;120-ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

**Compensation SAP**:
```
COMPENSACION;...;120-ANTICIPO COMPLETO EJEMPLO REPORTE 01;...;120-ANTICIPO COMPLETO EJEMPLO REPORTE 01;...
```

**✅ All three files now reference Report ID 120!**

---

## 🎯 **Benefits of Including Report ID**

1. **Traceability**: Easy to track from SAP file to database record
2. **Uniqueness**: Prevents confusion with similar reasons
3. **Integration**: SAP can reference the exact report
4. **Consistency**: All files for a report share the same ID
5. **Automation**: Easier to build automated processes

---

## 📚 **Related Documentation**

- [Prepayment Report ID Feature](PREPAYMENT_REPORT_ID_FEATURE.md)
- [SAP Prepayment File Specification](SAP_PREPAYMENT_FILE_SPECIFICATION.md)
- [Reports Approval Flowchart](REPORTS_APPROVAL_FLOWCHART.md)

---

**Next Steps**: Implement the code changes for Expenses and Compensation SAP files to include report_id in all relevant fields.

